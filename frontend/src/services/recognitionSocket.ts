/** WebSocket client for /ws/recognition with automatic reconnection. */
export type SocketStatus = "connecting" | "open" | "closed";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServerMessage = { type: string; [key: string]: any };

export class RecognitionSocket {
  private ws: WebSocket | null = null;
  private retryTimer: number | null = null;
  private closedByUser = false;
  status: SocketStatus = "closed";

  constructor(
    private onMessage: (msg: ServerMessage) => void,
    private onStatus: (status: SocketStatus) => void,
  ) {}

  connect(): void {
    this.closedByUser = false;
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) return;
    const proto = location.protocol === "https:" ? "wss" : "ws";
    this.setStatus("connecting");
    const ws = new WebSocket(`${proto}://${location.host}/ws/recognition`);
    this.ws = ws;
    ws.onopen = () => this.setStatus("open");
    ws.onmessage = (ev) => {
      try {
        this.onMessage(JSON.parse(ev.data));
      } catch {
        /* ignore malformed */
      }
    };
    ws.onclose = () => {
      this.ws = null;
      this.setStatus("closed");
      if (!this.closedByUser) this.retryTimer = window.setTimeout(() => this.connect(), 2000);
    };
    ws.onerror = () => ws.close();
  }

  private setStatus(s: SocketStatus) {
    this.status = s;
    this.onStatus(s);
  }

  /** Returns false if the message could not be sent (closed or congested). */
  send(msg: object): boolean {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    if (ws.bufferedAmount > 256 * 1024) return false; // drop frames instead of building latency
    ws.send(JSON.stringify(msg));
    return true;
  }

  close(): void {
    this.closedByUser = true;
    if (this.retryTimer) window.clearTimeout(this.retryTimer);
    this.ws?.close();
    this.ws = null;
  }
}
