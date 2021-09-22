import { SocketBase } from "./SocketBase.ts";
import { Buffer, IEndpoint } from "./Types.ts";

export class Pull extends SocketBase {
  protected xrecv(endpoint: IEndpoint, ...frames: Buffer[]): void {
    this.emit("message", endpoint, ...frames);
  }
}
