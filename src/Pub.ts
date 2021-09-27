import { XPub } from "./Xpub.ts";
import { Buffer, Endpoint } from "./Types.ts";

export class Pub extends XPub {
  protected xxrecv(_endpoint: Endpoint, ..._frames: Buffer[]): void {
    // Drop any message sent to pub socket
  }

  protected sendUnsubscription(): void {}
}
