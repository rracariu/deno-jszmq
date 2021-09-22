import { SocketBase } from "./SocketBase.ts";
import { Buffer, IEndpoint, Msg } from "./Types.ts";
import { MultiTrie } from "./utils/MultiTrie.ts";
import { Distribution } from "./utils/Distribution.ts";

export class XPub extends SocketBase {
  #subscriptions = new MultiTrie();
  #distribution = new Distribution();

  public constructor() {
    super();

    this.markAsMatching = this.markAsMatching.bind(this);
    this.sendUnsubscription = this.sendUnsubscription.bind(this);
  }

  private markAsMatching(endpoint: IEndpoint): void {
    this.#distribution.match(endpoint);
  }

  protected sendUnsubscription(
    endpoint: IEndpoint,
    data: Buffer,
    size: number,
  ): void {
    const unsubscription = Buffer.concat([
      Buffer.from([0]),
      data.slice(0, size),
    ]);
    endpoint.send([unsubscription]);
  }

  protected attachEndpoint(endpoint: IEndpoint): void {
    this.#distribution.attach(endpoint);
  }

  protected endpointTerminated(endpoint: IEndpoint): void {
    this.#subscriptions.removeEndpoint(endpoint, this.sendUnsubscription);
    this.#distribution.terminated(endpoint);
  }

  protected xsend(msg: Msg): void {
    let topic: Buffer;

    if (Buffer.isBuffer(msg[0])) {
      topic = msg[0];
    } else {
      topic = Buffer.from(msg[0], "utf8");
    }

    this.#subscriptions.match(topic, 0, topic.length, this.markAsMatching);
    this.#distribution.sendToMatching(msg);
  }

  protected xrecv(
    endpoint: IEndpoint,
    subscription: Buffer,
    ...frames: Buffer[]
  ): void {
    if (subscription.length > 0) {
      const type = subscription.readUInt8(0);
      if (type === 0 || type === 1) {
        let unique;

        if (type === 0) {
          unique = this.#subscriptions.remove(
            subscription,
            1,
            subscription.length - 1,
            endpoint,
          );
        } else {
          unique = this.#subscriptions.add(
            subscription,
            1,
            subscription.length - 1,
            endpoint,
          );
        }

        if (unique || this.options.xpubVerbose) {
          this.xxrecv(endpoint, subscription, ...frames);
        }

        return;
      }
    }

    this.xxrecv(endpoint, subscription, ...frames);
  }

  protected xxrecv(endpoint: IEndpoint, ...frames: Buffer[]): void {
    this.emit("message", endpoint, ...frames);
  }
}
