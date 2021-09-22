import { IEndpoint, Msg } from "../Types.ts";

export class LoadBalancer {
  #endpoints: IEndpoint[] = [];
  #current = 0;

  public attach(endpoint: IEndpoint): void {
    this.#endpoints.push(endpoint);
  }

  public terminated(endpoint: IEndpoint): void {
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
