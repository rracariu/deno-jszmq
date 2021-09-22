import { Dealer } from "./Dealer.ts";
import { Router } from "./Router.ts";
import { Sub } from "./Sub.ts";
import { XSub } from "./Xsub.ts";
import { Pub } from "./Pub.ts";
import { XPub } from "./Xpub.ts";
import { Pull } from "./Pull.ts";
import { Push } from "./Push.ts";
import { Pair } from "./Pair.ts";
import { Req } from "./Req.ts";
import { Rep } from "./Rep.ts";
import { SocketBase } from "./SocketBase.ts";

export function socket(
  type:
    | "dealer"
    | "router"
    | "pub"
    | "sub"
    | "xsub"
    | "xpub"
    | "pull"
    | "push"
    | "pair"
    | "req"
    | "rep",
): SocketBase {
  switch (type) {
    case "dealer":
      return new Dealer();
    case "router":
      return new Router();
    case "pub":
      return new Pub();
    case "sub":
      return new Sub();
    case "xsub":
      return new XSub();
    case "xpub":
      return new XPub();
    case "pull":
      return new Pull();
    case "push":
      return new Push();
    case "pair":
      return new Pair();
    case "req":
      return new Req();
    case "rep":
      return new Rep();
    default:
      throw new Error("Unsupported socket type");
  }
}

export { Sub } from "./Sub.ts";
export { XSub } from "./Xsub.ts";
export { Router } from "./Router.ts";
export { Dealer } from "./Dealer.ts";
export { XPub } from "./Xpub.ts";
export { Pub } from "./Pub.ts";
export { Push } from "./Push.ts";
export { Pull } from "./Pull.ts";
export { Pair } from "./Pair.ts";
export { Req } from "./Req.ts";
export { Rep } from "./Rep.ts";
export type { HttpHandler } from "./HttpHandler.ts";
export { DenoHttpServer } from "./utils/DenoHttpServer.ts";
export { Buffer } from "./Types.ts";
