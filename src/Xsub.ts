import { SocketBase } from "./SocketBase.ts";
import { Buffer, IEndpoint, Msg } from "./Types.ts";
import { Trie } from "./utils/Trie.ts";
import { Distribution } from "./utils/Distribution.ts";

export class XSub extends SocketBase {
  #subscriptions: Trie;
  #distribution: Distribution;

  public constructor() {
    super();
    this.#subscriptions = new Trie();
    this.#distribution = new Distribution();
  }

  protected attachEndpoint(endpoint: IEndpoint): void {
    this.#distribution.attach(endpoint);

    this.#subscriptions.forEach((s) =>
      endpoint.send([Buffer.concat([Buffer.from([1]), s])])
    );
  }

  protected hiccuped(endpoint: IEndpoint): void {
    this.#subscriptions.forEach((s) =>
      endpoint.send([Buffer.concat([Buffer.from([1]), s])])
    );
  }

  protected endpointTerminated(endpoint: IEndpoint): void {
    this.#distribution.terminated(endpoint);
  }

  protected xrecv(endpoint: IEndpoint, ...frames: Buffer[]): void {
    const topic = frames[0];

    const subscribed = this.#subscriptions.check(topic, 0, topic.length);
    if (subscribed) {
      this.emit("message", endpoint, ...frames);
    }
  }

  protected xsend(msg: Msg): void {
    const frame = msg[0];

    if (!Buffer.isBuffer(frame)) {
      throw new Error("subscription must be a buffer");
    }

    if (frame.length > 0 && frame.readUInt8(0) === 1) {
      this.#subscriptions.add(frame, 1, frame.length - 1);
      this.#distribution.sendToAll(msg);
    } else if (frame.length > 0 && frame.readUInt8(0) === 0) {
      // Removing only one subscriptions
      const removed = this.#subscriptions.remove(
        frame,
        1,
        frame.length - 1,
      );
      if (removed) {
        this.#distribution.sendToAll(msg);
      }
    } else {
      // upstream message unrelated to sub/unsub
      this.#distribution.sendToAll(msg);
    }
  }
}
