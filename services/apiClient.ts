/**
 * LogiLoad India - Unified AI/ML & Relational Backend API Client
 * Connects React UI to FastAPI backend on http://localhost:8000/api/v1
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export interface TokenUser {
  id: string;
  username: string;
  email?: string;
  fullName?: string;
  role: string;
  isActive: boolean;
}

export interface DelayPredictionResult {
  prediction_id: string;
  predicted_delay_minutes: number;
  delay_probability: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  model_name: string;
  model_version: string;
  feature_contributions: Record<string, number>;
  recommendation: string;
}

export interface CostPredictionResult {
  prediction_id: string;
  predicted_cost_inr: number;
  predicted_fuel_liters: number;
  lower_bound_inr: number;
  upper_bound_inr: number;
  cost_drivers: Record<string, number>;
  model_name: string;
  model_version: string;
}

export interface DailyForecastPoint {
  date: string;
  predicted_qty: number;
  lower_bound: number;
  upper_bound: number;
}

export interface DemandForecastResult {
  dealership_id: string;
  item_name: string;
  horizon_days: number;
  historical_avg_daily: number;
  total_forecast_qty: number;
  confidence_score: number;
  daily_forecast: DailyForecastPoint[];
  model_name: string;
  reasoning: string;
}

export interface AnomalyDetectResult {
  is_anomaly: boolean;
  anomaly_score: number;
  severity: 'NORMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  anomaly_types: string[];
  explanation: string;
}

export interface RouteOptimizationResult {
  optimized_stops: Array<{
    id: string;
    address: string;
    city: string;
    lat: number;
    lng: number;
  }>;
  total_distance_km: number;
  estimated_time_mins: number;
  estimated_cost_inr: number;
  improvement_vs_baseline_pct: number;
  algorithm_used: string;
  model_version: string;
  baseline_metrics: {
    distance_km: number;
    cost_inr: number;
  };
}

export interface VisionDetectionResult {
  detected_objects: any[];
  detected_dimensions_cm: {
    length: number;
    width: number;
    height: number;
  };
  calibration_status: string;
  confidence_pct: number;
  analysis_notes: string[];
}

export class ApiClient {
  private static token: string | null = localStorage.getItem('logiload_jwt_token');

  static setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('logiload_jwt_token', token);
    } else {
      localStorage.removeItem('logiload_jwt_token');
    }
  }

  static getToken(): string | null {
    return this.token || localStorage.getItem('logiload_jwt_token');
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errBody.detail || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // ── Authentication ────────────────────────────────────────────────────────
  static async login(username: string, password: string): Promise<{ access_token: string; user: TokenUser }> {
    const data = await this.request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    this.setToken(data.access_token);
    return data;
  }

  static async getMe(): Promise<TokenUser> {
    return this.request<TokenUser>('/auth/me');
  }

  // ── Shipments ─────────────────────────────────────────────────────────────
  static async getShipments(driverId?: string): Promise<any[]> {
    const query = driverId ? `?driver_id=${encodeURIComponent(driverId)}` : '';
    return this.request<any[]>(`/shipments${query}`);
  }

  static async createShipment(shipment: any): Promise<any> {
    return this.request<any>('/shipments', {
      method: 'POST',
      body: JSON.stringify(shipment)
    });
  }

  static async updateShipment(id: string, updates: any): Promise<any> {
    return this.request<any>(`/shipments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  static async assignDriver(shipmentId: string, driverId: string): Promise<any> {
    return this.request<any>(`/shipments/${shipmentId}/assign/${driverId}`, {
      method: 'PUT'
    });
  }

  // ── Fleet & Dealerships ───────────────────────────────────────────────────
  static async getVehicles(): Promise<any[]> {
    return this.request<any[]>('/fleet/vehicles');
  }

  static async getDrivers(): Promise<any[]> {
    return this.request<any[]>('/fleet/drivers');
  }

  static async getDealerships(): Promise<any[]> {
    return this.request<any[]>('/fleet/dealerships');
  }

  // ── AI Predictions ────────────────────────────────────────────────────────
  static async predictDelay(params: {
    distance_km: number;
    traffic_level?: number;
    weather_impact?: number;
    number_of_stops?: number;
    cargo_weight_kg?: number;
    is_fragile?: boolean;
    vehicle_type?: string;
  }): Promise<DelayPredictionResult> {
    return this.request<DelayPredictionResult>('/ai/delay/predict', {
      method: 'POST',
      body: JSON.stringify({
        distance_km: params.distance_km,
        traffic_level: params.traffic_level ?? 1.1,
        weather_impact: params.weather_impact ?? 0.0,
        number_of_stops: params.number_of_stops ?? 1,
        cargo_weight_kg: params.cargo_weight_kg ?? 500,
        is_fragile: params.is_fragile ?? false,
        vehicle_type: params.vehicle_type ?? 'tata-1109'
      })
    });
  }

  static async predictCost(params: {
    distance_km: number;
    cargo_weight_kg: number;
    number_of_stops?: number;
    fuel_price_inr?: number;
    mode?: 'truck' | 'air' | 'sea';
  }): Promise<CostPredictionResult> {
    return this.request<CostPredictionResult>('/ai/cost/predict', {
      method: 'POST',
      body: JSON.stringify({
        distance_km: params.distance_km,
        cargo_weight_kg: params.cargo_weight_kg,
        number_of_stops: params.number_of_stops ?? 1,
        fuel_price_inr: params.fuel_price_inr ?? 90.0,
        mode: params.mode ?? 'truck'
      })
    });
  }

  static async forecastDemand(
    dealershipId: string,
    itemName: string,
    horizonDays: number = 7
  ): Promise<DemandForecastResult> {
    return this.request<DemandForecastResult>('/ai/demand/forecast', {
      method: 'POST',
      body: JSON.stringify({
        dealership_id: dealershipId,
        item_name: itemName,
        horizon_days: horizonDays
      })
    });
  }

  static async detectAnomaly(params: {
    entity_type: string;
    entity_id: string;
    current_delay_minutes?: number;
    current_cost_inr?: number;
    expected_cost_inr?: number;
    temperature_celsius?: number;
    humidity_pct?: number;
    speed_kmh?: number;
    route_deviation_km?: number;
  }): Promise<AnomalyDetectResult> {
    return this.request<AnomalyDetectResult>('/ai/anomaly/detect', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  // ── Route & 3D Packing Optimization ───────────────────────────────────────
  static async optimizeRoute(
    origin: { id: string; address: string; city: string; lat: number; lng: number },
    stops: Array<{ id: string; address: string; city: string; lat: number; lng: number }>,
    algorithm: 'gnn_ppo' | 'baseline_osrm' = 'gnn_ppo'
  ): Promise<RouteOptimizationResult> {
    return this.request<RouteOptimizationResult>('/ai/optimization/route', {
      method: 'POST',
      body: JSON.stringify({
        origin,
        stops,
        algorithm
      })
    });
  }

  static async optimizePackingDRL(
    vehicle: any,
    items: any[],
    mode: string = 'drl'
  ): Promise<any> {
    return this.request<any>('/ai/optimization/packing', {
      method: 'POST',
      body: JSON.stringify({
        vehicle,
        items,
        mode
      })
    });
  }

  // ── Computer Vision ───────────────────────────────────────────────────────
  static async estimateVisionDimensions(
    base64Image: string,
    referenceObject: string = 'A4_Paper'
  ): Promise<VisionDetectionResult> {
    return this.request<VisionDetectionResult>('/ai/vision/dimensions', {
      method: 'POST',
      body: JSON.stringify({
        image: base64Image,
        reference_object: referenceObject
      })
    });
  }

  // ── Grounded Assistant Chat ───────────────────────────────────────────────
  static async sendChatMessage(message: string): Promise<{ response: string; tools_called: string[]; grounding_data?: any }> {
    return this.request<{ response: string; tools_called: string[]; grounding_data?: any }>('/ai/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }
}
