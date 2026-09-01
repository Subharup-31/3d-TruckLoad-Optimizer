import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import Dict, Any, List, Tuple
from backend.config import settings

class GraphConvLayer(nn.Module):
    """
    Graph Convolution Layer (GraphSAGE / GCN Message Passing)
    h_i' = W * (h_i + MEAN_{j in N(i)} h_j)
    """
    def __init__(self, in_features: int, out_features: int):
        super(GraphConvLayer, self).__init__()
        self.linear = nn.Linear(in_features, out_features)
        
    def forward(self, x: torch.Tensor, adj: torch.Tensor) -> torch.Tensor:
        # Degree normalization for adjacency
        deg = torch.sum(adj, dim=1, keepdim=True).clamp(min=1.0)
        norm_adj = adj / deg
        # Aggregate neighbors
        agg = torch.matmul(norm_adj, x)
        # Combine self and neighbors
        combined = x + agg
        return F.relu(self.linear(combined))

class TransportationGNN(nn.Module):
    def __init__(self, node_in_dim: int = 4, hidden_dim: int = 32, embed_dim: int = 16):
        super(TransportationGNN, self).__init__()
        self.conv1 = GraphConvLayer(node_in_dim, hidden_dim)
        self.conv2 = GraphConvLayer(hidden_dim, embed_dim)
        self.link_predictor = nn.Sequential(
            nn.Linear(embed_dim * 2, 32),
            nn.ReLU(),
            nn.Linear(32, 1) # Predict corridor travel efficiency / cost score
        )
        
    def forward(self, x: torch.Tensor, adj: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        h1 = self.conv1(x, adj)
        embeddings = self.conv2(h1, adj)
        return embeddings

class NetworkGNNService:
    def __init__(self):
        self.model = None
        self.model_version = "1.0.0"
        self.node_mapping = {
            "Mumbai": 0, "Pune": 1, "Bangalore": 2, "Hyderabad": 3,
            "Chennai": 4, "Delhi": 5, "Kolkata": 6, "Ahmedabad": 7,
            "Jaipur": 8, "Lucknow": 9
        }
        self.embeddings = None
        
    def train_or_initialize(self):
        # Build 10-node Indian golden quadrilateral & corridor topology
        n_nodes = len(self.node_mapping)
        # Node features: [lat_norm, lng_norm, demand_score, hub_capacity]
        node_features = np.array([
            [19.0760 / 30.0, 72.8777 / 90.0, 0.95, 1.0], # Mumbai
            [18.5204 / 30.0, 73.8567 / 90.0, 0.70, 0.8], # Pune
            [12.9716 / 30.0, 77.5946 / 90.0, 0.90, 1.0], # Bangalore
            [17.3850 / 30.0, 78.4867 / 90.0, 0.80, 0.9], # Hyderabad
            [13.0827 / 30.0, 80.2707 / 90.0, 0.75, 0.9], # Chennai
            [28.6139 / 30.0, 77.2090 / 90.0, 1.00, 1.0], # Delhi
            [22.5726 / 30.0, 88.3639 / 90.0, 0.85, 0.9], # Kolkata
            [23.0225 / 30.0, 72.5714 / 90.0, 0.70, 0.8], # Ahmedabad
            [26.9124 / 30.0, 75.7873 / 90.0, 0.60, 0.7], # Jaipur
            [26.8467 / 30.0, 80.9462 / 90.0, 0.65, 0.7]  # Lucknow
        ], dtype=np.float32)
        
        # Adjacency matrix (Highway & arterial connections)
        adj = np.zeros((n_nodes, n_nodes), dtype=np.float32)
        edges = [
            (0, 1), (1, 0), (0, 7), (7, 0), (1, 2), (2, 1), (2, 3), (3, 2),
            (2, 4), (4, 2), (3, 4), (4, 3), (0, 5), (5, 0), (5, 8), (8, 5),
            (5, 9), (9, 5), (9, 6), (6, 9), (3, 6), (6, 3), (7, 8), (8, 7)
        ]
        for src, dst in edges:
            adj[src, dst] = 1.0
            
        x_tensor = torch.tensor(node_features)
        adj_tensor = torch.tensor(adj)
        
        self.model = TransportationGNN(node_in_dim=4, hidden_dim=32, embed_dim=16)
        
        # Quick unsupervised graph reconstruction step
        optimizer = torch.optim.Adam(self.model.parameters(), lr=0.01)
        for _ in range(30):
            optimizer.zero_grad()
            emb = self.model(x_tensor, adj_tensor)
            # Reconstruct adjacency from embedding cosine similarity
            sim = torch.matmul(emb, emb.T)
            loss = F.mse_loss(torch.sigmoid(sim), adj_tensor)
            loss.backward()
            optimizer.step()
            
        self.embeddings = emb.detach().numpy()
        self.save()
        
    def get_corridor_similarity(self, city_a: str, city_b: str) -> float:
        if self.embeddings is None:
            self.load()
            
        idx_a = self.node_mapping.get(city_a, 0)
        idx_b = self.node_mapping.get(city_b, 1)
        
        emb_a = self.embeddings[idx_a]
        emb_b = self.embeddings[idx_b]
        
        dot = np.dot(emb_a, emb_b)
        norm = (np.linalg.norm(emb_a) * np.linalg.norm(emb_b)) or 1.0
        return float(np.clip(dot / norm, 0.0, 1.0))
        
    def save(self):
        settings.MODEL_DIR.mkdir(parents=True, exist_ok=True)
        torch.save({
            "state_dict": self.model.state_dict() if self.model else None,
            "embeddings": self.embeddings,
            "version": self.model_version
        }, settings.MODEL_DIR / "transport_gnn.pt")
        
    def load(self):
        path = settings.MODEL_DIR / "transport_gnn.pt"
        if path.exists():
            checkpoint = torch.load(path, map_location=torch.device("cpu"), weights_only=False)
            self.model = TransportationGNN(node_in_dim=4, hidden_dim=32, embed_dim=16)
            if checkpoint.get("state_dict"):
                self.model.load_state_dict(checkpoint["state_dict"])
            self.embeddings = checkpoint.get("embeddings")
        else:
            self.train_or_initialize()

network_gnn = NetworkGNNService()
