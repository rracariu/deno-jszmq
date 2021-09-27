import { Endpoint, Msg } from "../Types.ts";

export class LoadBalancer {
  #endpoints: Endpoint[] = [];
  #current = 0;

  public attach(endpoint: Endpoint): void {
    this.#endpoints.push(endpoint);
  }

  public terminated(endpoint: Endpoint): void {
    const index = this.#endpoints.indexOf(endpoint);

    if (this.#current === this.#endpoints.length - 1) {
      this.#current = 0;
    }

    this.#endpoints.splice(index, 1);
  }

  public send(msg: Msg): boolean {
    if (this.#endpoints.length === 0) {
      return false;
    }

    const result = this.#endpoints[this.#current].send(msg);
    this.#current = (this.#current + 1) % this.#endpoints.length;

    return result;
  }
}
