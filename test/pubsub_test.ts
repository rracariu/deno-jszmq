import { DenoHttpServer } from "../src/utils/DenoHttpServer.ts";
import { XPub } from "../src/Xpub.ts";
import { Sub } from "../src/Sub.ts";
import { Endpoint } from "../src/Types.ts";

import {
  assert,
  assertStrictEquals,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

const url = "ws://localhost:55556";

Deno.test({
  name: "pubsub",
  async fn() {
    let complete = false;
    let timer: number | undefined;
    const httpServer = new DenoHttpServer(url);

    const pub = new XPub();
    pub.bind(httpServer);
    pub.addListener("message", () => {
      pub.send("B");
      pub.send("AAA");
    });

    const sub = new Sub();
    sub.addListener("message", (_endpoint: Endpoint, topic: Uint8Array) => {
      assertStrictEquals(topic.toString(), "AAA");
      complete = true;
      ensureCompleted();
    });

    const ensureCompleted = () => {
      clearTimeout(timer);
      assert(complete, "Must complete the request");
      pub.close();
      sub.close();
      httpServer.close();
    };

    setTimeout(() => {
      sub.subscribe("A");
      sub.connect(url);
      timer = setTimeout(() => {
        ensureCompleted();
      }, 4500 /* a timeout interval for max response time */);
    }, 100);

    await httpServer.listen();
  },
});

Deno.test({
  name: "unsubscribe",
  async fn() {
    let complete = false;
    let first = true;
    let timer: number | undefined;
    const httpServer = new DenoHttpServer(url);

    const pub = new XPub();
    pub.bind(httpServer);
    pub.addListener("message", () => {
      pub.send("A");
    });

    const sub = new Sub();
    sub.addListener("message", (_endpoint: Endpoint, topic1: Uint8Array) => {
      if (first) {
        assertStrictEquals(topic1.toString(), "A");
        first = false;
      }
      sub.unsubscribe("A");
      pub.send("A");
      pub.send("B");

      sub.addListener("message", (_endpoint: Endpoint, topic2: Uint8Array) => {
        assertStrictEquals(topic2.toString(), "B");
        complete = true;
        ensureCompleted();
      });
    });

    const ensureCompleted = () => {
      clearTimeout(timer);
      assert(complete, "Must complete the request");
      pub.close();
      sub.close();
      httpServer.close();
    };

    setTimeout(() => {
      sub.subscribe("A");
      sub.subscribe("B");
      sub.connect(url);
      timer = setTimeout(() => {
        ensureCompleted();
      }, 4500 /* a timeout interval for max response time */);
    }, 100);

    await httpServer.listen();
  },
});
