export interface LiveTelemetryItem {
  driver_id: string;
  driver_name: string;
  vehicle_id: string;
  lat: number;
  lng: number;
  accuracy: number;
  speed: number;
  heading: number;
  source: string;
  timestamp: number;
  status: string;
}

type TelemetryCallback = (telemetryList: LiveTelemetryItem[], latest?: LiveTelemetryItem) => void;
type StatusCallback = (connected: boolean) => void;

class WebSocketTelemetryService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: any = null;
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = true;
  private listeners: Set<TelemetryCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  private wsUrl: string = 'ws://localhost:8000/api/v1/telemetry/ws';

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.shouldReconnect = true;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log('⚡ [LogiLoad WS] Telemetry WebSocket Connected');
        this.notifyStatus(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'telemetry_update' || data.type === 'initial_telemetry') {
            const list: LiveTelemetryItem[] = data.telemetry || [];
            const latest: LiveTelemetryItem | undefined = data.latest_packet;
            this.listeners.forEach((callback) => callback(list, latest));
          }
        } catch (err) {
          console.error('[LogiLoad WS] Error parsing message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.notifyStatus(false);
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        this.isConnecting = false;
        this.notifyStatus(false);
      };
    } catch (err) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, 3000);
  }

  sendGpsPing(packet: {
    driver_id: string;
    driver_name: string;
    vehicle_id: string;
    lat: number;
    lng: number;
    accuracy: number;
    speed: number;
    heading: number;
  }) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'gps_ping',
          ...packet,
          source: 'Driver Smartphone (WebSocket 60FPS)'
        })
      );
    } else {
      // Fallback to HTTP POST if WebSocket isn't yet ready
      fetch('http://localhost:8000/api/v1/telemetry/gps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...packet,
          accuracy_meters: packet.accuracy,
          speed_kmh: packet.speed,
          device_source: 'Driver Smartphone (REST Fallback)'
        })
      }).catch(() => {});
    }
  }

  subscribe(callback: TelemetryCallback): () => void {
    this.listeners.add(callback);
    this.connect();
    return () => {
      this.listeners.delete(callback);
    };
  }

  subscribeStatus(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    callback(this.ws?.readyState === WebSocket.OPEN);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((callback) => callback(connected));
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsTelemetryService = new WebSocketTelemetryService();
