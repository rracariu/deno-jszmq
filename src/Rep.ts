import { Router } from "./Router.ts";
import { Buffer, IEndpoint, Msg } from "./Types.ts";

type PendingMsg = [IEndpoint, Buffer[]];

export class Rep extends Router {
  private static bottom = Buffer.alloc(0);

  #sendingReply: boolean;
  #ids: Buffer[];
  #pending: PendingMsg[];

  public constructor() {
    super();
    this.#sendingReply = false;
    this.#ids = [];
    this.#pending = [];
  }

  protected xsend(msg: Msg): void {
    // If we are in the middle of receiving a request, we cannot send reply.
    if (!this.#sendingReply) {
      throw new Error("cannot send another reply");
    }

    const withIds = [...this.#ids, Rep.bottom, ...msg];
    super.xsend(withIds);

    this.#ids = [];

    // We are ready to handle next message
    const nextMsg = this.#pending.shift();
    if (nextMsg) {
      setTimeout(() => this.recvInternal(nextMsg[0], nextMsg[1]));
    } else {
      this.#sendingReply = false;
    }
  }

  private recvInternal(endpoint: IEndpoint, frames: Buffer[]): void {
    for (;;) {
      const frame = frames.shift();

      // Invalid msg, dropping current msg
      if (!frame) {
        this.#ids = [];

        const nextMsg = this.#pending.shift();
        if (nextMsg) {
          this.recvInternal(nextMsg[0], nextMsg[1]);
        }

        return;
      }

      // Reached bottom, enqueue msg
      if (frame.length === 0) {
        this.#sendingReply = true;
        this.emit("message", endpoint, ...frames);
        return;
      }

      this.#ids.push(frame);
    }
  }

  protected xxrecv(endpoint: IEndpoint, ...frames: Buffer[]): void {
    // If we are in middle of sending a reply, we cannot receive next request yet, add to pending
    if (this.#sendingReply) {
      this.#pending.push([endpoint, frames]);
    } else {
      this.recvInternal(endpoint, frames);
    }
  }
}
