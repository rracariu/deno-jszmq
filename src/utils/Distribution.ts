import { pull } from "https://cdn.skypack.dev/lodash";
import { IEndpoint, Msg } from "../Types.ts";

function swap<T>(items: Array<T>, index1: number, index2: number): void {
  if (index1 === index2) {
    return;
  }

  const item1 = items[index1];
  const item2 = items[index2];
  if (item1 !== null) {
    items[index2] = item1;
  }
  if (item2 !== null) {
    items[index1] = item2;
  }
}

export class Distribution {
  #endpoints: IEndpoint[] = [];
  #matching = 0;
  #active = 0;

  public attach(endpoint: IEndpoint): void {
    this.#endpoints.push(endpoint);
    swap(this.#endpoints, this.#active, this.#endpoints.length - 1);
    this.#active++;
  }

  public match(endpoint: IEndpoint): void {
    const index = this.#endpoints.indexOf(endpoint);

    // If pipe is already matching do nothing.
    if (index < this.#matching) {
      return;
    }

    // If the pipe isn't active, ignore it.
    if (index >= this.#active) {
      return;
    }

    // Mark the pipe as matching.
    swap(this.#endpoints, index, this.#matching);
    this.#matching++;
  }

  public unmatch(): void {
    this.#matching = 0;
  }

  public terminated(endpoint: IEndpoint): void {
    // Remove the endpoint from the list; adjust number of matching, active and/or
    // eligible endpoint accordingly.
    if (this.#endpoints.indexOf(endpoint) < this.#matching) {
      this.#matching--;
    }
    if (this.#endpoints.indexOf(endpoint) < this.#active) {
      this.#active--;
    }

    pull(this.#endpoints, endpoint);
  }

  public activated(endpoint: IEndpoint): void {
    // Move the pipe from passive to active state.
    swap(this.#endpoints, this.#endpoints.indexOf(endpoint), this.#active);
    this.#active++;
  }

  public sendToAll(msg: Msg): void {
    this.#matching = this.#active;
    this.sendToMatching(msg);
  }

  public sendToMatching(msg: Msg): void {
    // If there are no matching pipes available, simply drop the message.
    if (this.#matching === 0) {
      return;
    }

    for (let i = 0; i < this.#matching; i++) {
      if (!this.write(this.#endpoints[i], msg)) {
        --i; //  Retry last write because index will have been swapped
      }
    }
  }

  public write(endpoint: IEndpoint, msg: Msg): boolean {
    if (!endpoint.send(msg)) {
      swap(
        this.#endpoints,
        this.#endpoints.indexOf(endpoint),
        this.#matching - 1,
      );
      this.#matching--;
      swap(
        this.#endpoints,
        this.#endpoints.indexOf(endpoint),
        this.#active - 1,
      );
      this.#active--;
      return false;
    }

    return true;
  }
}
