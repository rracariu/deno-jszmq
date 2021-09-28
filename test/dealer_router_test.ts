import { DenoHttpServer } from "../src/utils/DenoHttpServer.ts";
import { Dealer } from "../src/Dealer.ts";
import { Router } from "../src/Router.ts";
import { Endpoint, Frame } from "../src/Types.ts";
import {
  assert,
  assertStrictEquals,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

const url = "ws://localhost:3002/dealer-router";

Deno.test({
  name: "dealer-router",
  async fn() {
    let complete = false;
    let timer: number | undefined;
    const httpServer = new DenoHttpServer(url);

    const router = new Router();
    router.bind(httpServer);
    router.addListener(
      "message",
      (_endpoint: Endpoint, routingId: Frame, message: Uint8Array) => {
        assertStrictEquals(message.toString(), "hello");
        router.send([routingId, "world"]);
      },
    );

    const dealer = new Dealer();
    dealer.addListener("message", (_endpoint: Endpoint, reply: Uint8Array) => {
      assertStrictEquals(reply.toString(), "world");
      complete = true;
      ensureCompleted();
    });

    const ensureCompleted = () => {
      clearTimeout(timer);
      assert(complete, "Must complete the dealer's request");
      dealer.close();
      httpServer.close();
    };

    setTimeout(() => {
      dealer.connect(url);
      dealer.send("hello");

      timer = setTimeout(() => {
        ensureCompleted();
      }, 4500 /* a timeout interval for max response time */);
    }, 100);

    await httpServer.listen();
  },
});
