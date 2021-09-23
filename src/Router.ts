import { SocketBase } from "./SocketBase.ts";
import { includes, pull } from "https://cdn.skypack.dev/lodash";
import { Buffer, IEndpoint, Msg } from "./Types.ts";

export class Router extends SocketBase {
  #anonymousPipes: IEndpoint[] = [];
  #pipes: Map<string, IEndpoint> = new Map<string, IEndpoint>();
  protected nextId = 0;

  public constructor() {
    super();
    this.options.recvRoutingId = true;
  }

  protected attachEndpoint(endpoint: IEndpoint): void {
    this.#anonymousPipes.push(endpoint);
  }

  protected endpointTerminated(endpoint: IEndpoint): void {
    this.#pipes.delete(endpoint.routingKeyString);
    pull(this.#anonymousPipes, endpoint);
  }

  protected xrecv(endpoint: IEndpoint, ...msg: Buffer[]): void {
    // For anonymous pipe, the first message is the identity
    if (includes(this.#anonymousPipes, endpoint)) {
      pull(this.#anonymousPipes, endpoint);

      const routingKey = msg[0];
      if (routingKey.length > 0) {
        endpoint.routingKey = Buffer.concat([
          new Uint8Array([0]),
          routingKey,
        ]);
      } else {
        const buffer = Buffer.alloc(5);
        buffer.writeUInt8(1, 0);
        buffer.writeInt32BE(this.nextId, 1);
        endpoint.routingKey = buffer;
        this.nextId++;
      }

      endpoint.routingKeyString = endpoint.routingKey.toString("hex");
      this.#pipes.set(endpoint.routingKeyString, endpoint);

      return;
    }

    this.xxrecv(endpoint, endpoint.routingKey, ...msg);
  }

  protected xxrecv(endpoint: IEndpoint, ...msg: Buffer[]): void {
    this.emit("message", endpoint, ...msg);
  }

  protected xsend(msg: Msg): void {
    if (msg.length <= 1) {
      throw new Error("router message must include a routing key");
    }

    const routingKey = msg.shift();
    if (!Buffer.isBuffer(routingKey)) {
      throw new Error("routing key must be a buffer");
    }

    const endpoint = this.#pipes.get(routingKey.toString("hex"));
    if (!endpoint) {
      return; // TODO: use mandatory option, if true throw exception here
    }

    endpoint.send(msg);
  }
}
