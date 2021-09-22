import { EventEmitter } from "https://deno.land/std@0.106.0/node/events.ts";
import { SocketOptions } from "./SocketOptions.ts";
import { find, pull } from "https://cdn.skypack.dev/lodash";
import { Buffer, Frame, IEndpoint, IListener, Msg } from "./Types.ts";
import { WebSocketListener } from "./WebSocketListener.ts";
import { WebSocketEndpoint } from "./WebSocketEndpoint.ts";
import { HttpHandler } from "./HttpHandler.ts";

export class SocketBase extends EventEmitter {
  #endpoints: IEndpoint[] = [];
  #binds: IListener[] = [];
  public readonly options = new SocketOptions();

  public constructor() {
    super();
    this.bindAttachEndpoint = this.bindAttachEndpoint.bind(this);
    this.bindEndpointTerminated = this.bindEndpointTerminated.bind(this);
    this.attachEndpoint = this.attachEndpoint.bind(this);
    this.endpointTerminated = this.endpointTerminated.bind(this);
    this.xrecv = this.xrecv.bind(this);
    this.hiccuped = this.hiccuped.bind(this);
  }

  public connect(address: string): void {
    if (address.startsWith("ws://") || address.startsWith("wss://")) {
      const endpoint = new WebSocketEndpoint(address, this.options, {});
      endpoint.on("attach", this.attachEndpoint);
      endpoint.on("terminated", this.endpointTerminated);
      endpoint.on("message", this.xrecv);
      endpoint.on("hiccuped", this.hiccuped);
      this.#endpoints.push(endpoint);

      if (!this.options.immediate) {
        this.attachEndpoint(endpoint);
      }
    } else {
      throw new Error("unsupported transport");
    }
  }

  public disconnect(address: string): void {
    const endpoint = find(
      this.#endpoints,
      (e: IEndpoint) => e.address === address,
    );

    if (endpoint) {
      endpoint.removeListener("attach", this.attachEndpoint);
      endpoint.removeListener("terminated", this.endpointTerminated);
      endpoint.removeListener("message", this.xrecv);
      endpoint.removeListener("hiccuped", this.hiccuped);
      endpoint.close();
      pull(this.#endpoints, endpoint);
      this.endpointTerminated(endpoint);
    }
  }

  public bind<Data extends Record<string, unknown>>(
    server: HttpHandler<Data>,
    address: string = server.address,
  ): void {
    const listener = new WebSocketListener(address, server, this.options);
    listener.on("attach", this.bindAttachEndpoint);
    this.#binds.push(listener);
  }

  public unbind(address: string): void {
    const listener = find(
      this.#binds,
      (b: IListener) => b.address === address,
    );

    if (listener) {
      listener.removeListener("attach", this.attachEndpoint);
      listener.close();
      pull(this.#binds, listener);
    }
  }

  public close(): void {
    this.#binds.forEach((listener) => {
      listener.removeListener("attach", this.attachEndpoint);
      listener.close();
    });

    this.#binds = [];

    this.#endpoints.forEach((endpoint) => {
      endpoint.removeListener("attach", this.attachEndpoint);
      endpoint.removeListener("terminated", this.endpointTerminated);
      endpoint.removeListener("message", this.xrecv);
      endpoint.removeListener("hiccuped", this.hiccuped);
      endpoint.close();
      pull(this.#endpoints, endpoint);
      this.endpointTerminated(endpoint);
    });
  }

  public emit(
    eventName: string | symbol,
    endpoint: IEndpoint,
    // deno-lint-ignore no-explicit-any
    ...args: any[]
  ): boolean {
    return super.emit(eventName, endpoint, ...args);
  }

  public subscribe(_topic: Frame): void {
    throw new Error("not supported");
  }

  public unsubscribe(_topic: Frame): void {
    throw new Error("not supported");
  }

  private bindAttachEndpoint(endpoint: IEndpoint): void {
    endpoint.on("terminated", this.bindEndpointTerminated);
    endpoint.on("message", this.xrecv);

    this.attachEndpoint(endpoint);
  }

  private bindEndpointTerminated(endpoint: IEndpoint): void {
    endpoint.removeListener("terminated", this.bindEndpointTerminated);
    endpoint.removeListener("message", this.xrecv);

    this.endpointTerminated(endpoint);
  }

  protected attachEndpoint(_endpoint: IEndpoint): void {}

  protected endpointTerminated(_endpoint: IEndpoint): void {}

  protected hiccuped(_endpoint: IEndpoint): void {}

  protected xrecv(_endpoint: IEndpoint, ..._frames: Buffer[]): void {}

  protected xsend(_msg: Msg): void {}

  public send(msg: Msg | Frame): void {
    if (Array.isArray(msg)) {
      this.xsend(msg);
    } else {
      this.xsend([msg]);
    }
  }
}
