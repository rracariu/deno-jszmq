import { XSub } from "./Xsub.ts";
import { Buffer, Frame, Msg } from "./Types.ts";

export class Sub extends XSub {
  public subscribe(topic: Frame): void {
    if (typeof topic === "string") {
      const frame = Buffer.concat([Buffer.from([1]), Buffer.from(topic)]);
      super.xsend([frame]);
    } else if (Buffer.isBuffer(topic)) {
      const frame = Buffer.concat([Buffer.from([1]), topic]);
      super.xsend([frame]);
    } else {
      throw new Error("unsupported topic type");
    }
  }

  public unsubscribe(topic: Frame): void {
    if (typeof topic === "string") {
      const frame = Buffer.concat([Buffer.from([0]), Buffer.from(topic)]);
      super.xsend([frame]);
    } else if (Buffer.isBuffer(topic)) {
      const frame = Buffer.concat([Buffer.from([0]), topic]);
      super.xsend([frame]);
    } else {
      throw new Error("unsupported topic type");
    }
  }

  protected xsend(_msg: Msg): void {
    throw new Error("not supported");
  }
}
