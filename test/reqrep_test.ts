import { DenoHttpServer } from "../src/utils/DenoHttpServer.ts";
import { Buffer, Rep, Req } from "../src/index.ts";

import {
  assert,
  assertStrictEquals,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

const url = "ws://localhost:8188";

Deno.test({
  name: "request-reply",
  async fn() {
    let complete = false;
    let timer: number | undefined;
    const httpServer = new DenoHttpServer(url);

    const rep = new Rep();
    rep.bind(httpServer);
    rep.addListener("message", (_endpoint: never, msg: Uint8Array) => {
      assertStrictEquals(msg.toString(), "Hello");
      rep.send("World");
    });

    const req = new Req();
    req.addListener("message", (_endpoint: never, message: Uint8Array) => {
      assertStrictEquals(message.toString(), "World");
      complete = true;
      ensureCompleted();
    });

    const ensureCompleted = () => {
      clearTimeout(timer);
      assert(complete, "Must complete the request");
      req.close();
      rep.close();
      httpServer.close();
    };

    setTimeout(() => {
      req.connect(url);
      req.send("Hello");
      timer = setTimeout(() => {
        ensureCompleted();
      }, 4500 /* a timeout interval for max response time */);
    }, 100);

    await httpServer.listen();
  },
});

Deno.test({
  name: "multiple requests",
  async fn() {
    const maxReq = 10;
    let complete = false;
    let timer: number | undefined;
    const httpServer = new DenoHttpServer(url);

    const requests: Req[] = [];
    const lastReq = new Req();

    const reply = new Rep();
    reply.bind(httpServer);
    reply.addListener(
      "message",
      (_endpoint: unknown, msg: Buffer) => reply.send(msg),
    );

    lastReq.addListener(
      "message",
      (_endpoint: unknown, message: Uint8Array) => {
        assertStrictEquals(message.toString(), "done");
        complete = true;
        ensureCompleted();
      },
    );

    const ensureCompleted = () => {
      clearTimeout(timer);
      assert(complete, "Must complete the request");
      for (const req of requests) {
        req.close();
      }
      lastReq.close();
      reply.close();
      httpServer.close();
    };

    setTimeout(() => {
      for (let i = 0; i < maxReq; i++) {
        requests[i] = new Req();
        requests[i].connect(url);
      }
      lastReq.connect(url);

      for (let i = 0; i < maxReq; i++) {
        requests[i].send(i.toString());
        requests[i].addListener(
          "message",
          // deno-lint-ignore no-explicit-any
          (_endpoint: unknown, reply: any) => {
            assertStrictEquals(reply.toString(), i.toString());
            if (i == maxReq - 1) {
              lastReq.send("done");
            }
          },
        );
      }

      timer = setTimeout(() => {
        ensureCompleted();
      }, 8000 /* a timeout interval for max response time */);
    }, 100);

    await httpServer.listen();
  },
});
