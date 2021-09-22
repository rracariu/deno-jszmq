import { SocketBase } from "./SocketBase.ts";
import { Buffer, IEndpoint, Msg } from "./Types.ts";

export class Pair extends SocketBase {
  #endpoint?: IEndpoint;
  #pending: Msg[] = [];

  protected attachEndpoint(endpoint: IEndpoint): void {
    if (this.#endpoint) {
      endpoint.close();
      return;
    }

    this.#endpoint = endpoint;

    for (;;) {
      const msg = this.#pending.shift();
      if (!msg) {
        break;
      }

      if (!endpoint.send(msg)) {
        break;
      }
    }
  }

  protected endpointTerminated(endpoint: IEndpoint): void {
    if (endpoint === this.#endpoint) {
      this.#endpoint = undefined;
    }
  }

  protected xrecv(endpoint: IEndpoint, ...frames: Buffer[]): void {
    if (endpoint === this.#endpoint) {
      this.emit("message", endpoint, ...frames);
    }
  }

  protected xsend(msg: Msg): void {
    if (this.#endpoint) {
      this.#endpoint.send(msg);
    } else {
      this.#pending.push(msg);
    }
  }
}
