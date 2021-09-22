import { WebSocketListener } from "./WebSocketListener.ts";

export interface HttpHandler<Data extends Record<string, unknown>> {
  readonly address: string;

  registerPath(
    path: string,
    listener: WebSocketListener<Data>,
  ): void;

  removePath(path: string): void;
}
