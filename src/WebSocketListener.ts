import { EventEmitter } from "https://deno.land/std@0.108.0/node/events.ts";
import { SocketOptions } from "./SocketOptions.ts";
import { WebSocketEndpoint as Endpoint } from "./WebSocketEndpoint.ts";
import { Listener } from "./Types.ts";
import { HttpHandler } from "./HttpHandler.ts";

export class WebSocketListener<Data extends Record<string, unknown>>
  extends EventEmitter
  implements Listener {
  public readonly path: string | undefined;
  #endPoint?: Endpoint<Data>;

  public constructor(
    public address: string,
    private httpServer: HttpHandler<Data>,
    private options: SocketOptions,
  ) {
    super();
    this.onConnection = this.onConnection.bind(this);

    if (!Deno) {
      throw "binding websocket is not supported on browser";
    }

    const url = new URL(address);
    this.path = url.pathname;

    this.httpServer.registerPath(url.pathname, this);
  }

  public onConnection(connection: WebSocket, data: Data): void {
    this.#endPoint = new Endpoint(connection, this.options, data);
    this.emit("attach", this.#endPoint);
  }

  public close(): void {
    if (this.path) {
      this.httpServer.removePath(this.path);
    }
    this.#endPoint?.close();
  }
}
