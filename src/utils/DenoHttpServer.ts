import { HttpHandler } from "../HttpHandler.ts";
import { WebSocketListener } from "../WebSocketListener.ts";

export class DenoHttpServer<Data extends Record<string, unknown>>
  implements HttpHandler<Data> {
  public readonly address: string;
  #listener: Deno.Listener;
  #socketListeners: Map<string, WebSocketListener<Data>> = new Map();

  constructor(address: string) {
    if (address.startsWith("ws://") || address.startsWith("wss://")) {
      this.address = address;
      const url = new URL(address);

      let port;
      if (url.port) {
        port = parseInt(url.port);
      } else if (url.protocol === "wss") {
        port = 443;
      } else {
        port = 80;
      }
      this.#listener = Deno.listen({ port });
    } else {
      throw new Error("unsupported transport");
    }
  }

  public registerPath(
    path: string,
    listener: WebSocketListener<Data>,
  ): void {
    if (this.#socketListeners.has(path)) {
      throw Error("Path already registered for an Websocket listener.");
    }
    this.#socketListeners.set(path, listener);
  }

  public removePath(path: string): void {
    this.#socketListeners.delete(path);
  }

  public async listen(): Promise<void> {
    for await (const conn of this.#listener) {
      this.handle(conn);
    }
  }

  public close(): void {
    this.#listener.close();
  }

  private async handle(conn: Deno.Conn): Promise<void> {
    const httpConn = Deno.serveHttp(conn);
    for await (const requestEvent of httpConn) {
      await requestEvent.respondWith(this.handleReq(requestEvent.request));
    }
  }

  private handleReq(req: Request): Response {
    if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Missing upgrade to websocket header.", {
        status: 400,
      });
    }

    if (
      !req.headers.get("sec-websocket-protocol")?.toUpperCase().includes(
        "ZWS2.0",
      )
    ) {
      return new Response("Invalid websocket protocol specified.", {
        status: 400,
      });
    }

    const path = new URL(req.url).pathname;

    const handler = this.#socketListeners.get(path);

    if (!handler) {
      return new Response("Invalid path.", { status: 404 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    const headers: { [key: string]: string } = {};
    req.headers.forEach((val, key) => {
      headers[key] = val;
    });
    socket.onopen = () => handler.onConnection(socket, headers as Data);

    return response;
  }
}
