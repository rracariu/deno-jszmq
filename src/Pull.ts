import { SocketBase } from "./SocketBase.ts";
import { Buffer, Endpoint } from "./Types.ts";

export class Pull extends SocketBase {
  protected xrecv(endpoint: Endpoint, ...frames: Buffer[]): void {
    this.emit("message", endpoint, ...frames);
  }
}
