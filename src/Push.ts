import { SocketBase } from "./SocketBase.ts";
import { LoadBalancer } from "./utils/LoadBalancer.ts";
import { Endpoint, Msg } from "./Types.ts";

export class Push extends SocketBase {
  #loadBalancer = new LoadBalancer();
  #pending: Msg[] = [];

  protected attachEndpoint(endpoint: Endpoint): void {
    this.#loadBalancer.attach(endpoint);

    for (;;) {
      const msg = this.#pending.shift();
      if (!msg) {
        break;
      }

      if (!this.#loadBalancer.send(msg)) {
        break;
      }
    }
  }

  protected endpointTerminated(endpoint: Endpoint): void {
    this.#loadBalancer.terminated(endpoint);
  }

  protected xsend(msg: Msg): void {
    if (!this.#loadBalancer.send(msg)) {
      this.#pending.push(msg);
    }
  }
}
