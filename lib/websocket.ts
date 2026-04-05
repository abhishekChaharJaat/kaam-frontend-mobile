type MessageHandler = (message: any) => void;

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
const WS_URL = API_URL.replace("http", "ws");

export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private conversationId: string;
  private token: string;
  private onMessage: MessageHandler;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(conversationId: string, token: string, onMessage: MessageHandler) {
    this.conversationId = conversationId;
    this.token = token;
    this.onMessage = onMessage;
  }

  connect() {
    const url = `${WS_URL}/ws/chat/${this.conversationId}?token=${this.token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessage(data);
      } catch {}
    };

    this.ws.onclose = () => {
      this.attemptReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  send(data: { text: string; message_type?: string; attachment_url?: string }) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.maxReconnectAttempts = 0;
    this.ws?.close();
    this.ws = null;
  }
}
