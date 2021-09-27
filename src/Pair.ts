import { SocketBase } from "./SocketBase.ts";
import { Buffer, Endpoint, Msg } from "./Types.ts";

export class Pair extends SocketBase {
  #endpoint?: Endpoint;
  #pending: Msg[] = [];

  protected attachEndpoint(endpoint: Endpoint): void {
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

  protected endpointTerminated(endpoint: Endpoint): void {
    if (endpoint === this.#endpoint) {
      this.#endpoint = undefined;
    }
  }

  protected xrecv(endpoint: Endpoint, ...frames: Buffer[]): void {
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
