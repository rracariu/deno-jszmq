# deno-jszmq

**deno-jszmq** is a port of [jszmq](https://github.com/zeromq/jszmq) to
TypeScript and Deno, whereas jszmq is port of zeromq to Javascript, supporting
both browsers and Deno. The library only support the WebSocket transport
([ZWS 2.0](https://rfc.zeromq.org/spec:45/ZWS/)).

The API of the library is similar to that of
[zeromq.js](https://github.com/zeromq/zeromq.js).

## Compatibility with ZeroMQ

WebSocket transport added to [zeromq](https://github.com/zeromq/libzmq)
recently, and it is only available when compiling from source.

Other ports of zeromq, like NetMQ (C#) and JeroMQ (Java) don't yet support the
WebSocket transport.

## Compatibility with ZWS 1.0, zwssock, JSMQ and NetMQ.WebSockets

The library is currently not compatible with ZWS 1.0 and the implementation of
it.

## Installation

Directly importing it:

```typescript
import * as zmq from "https://deno.land/x/jszmq/mod.ts"
```

Or as `import-map.json`:
```json
"imports": {
  "jszmq": "https://deno.land/x/jszmq/mod.ts",
}
```

```
deno run -A --unstable --importmap=import-map.json
```

## Supported socket types

Following socket types are currently supported:

- Pub
- Sub
- XPub
- XSub
- Dealer
- Router
- Req
- Rep
- Push
- Pull

## How to use

Import jszmq with one of the following:

```typescript
import * as zmq from "https://deno.land/x/jszmq/mod.ts";
```

### Creating a socket

To create a socket you can either use the `socket` function, which is compatible
with zeromq.js or use the socket type class.

Socket type class:

```typescript
const dealer = new Dealer();
```

with socket function:

```typescript
const dealer = socket("dealer");
```

### Bind

To bind call the `bind` function:

```typescript
import { DenoHttpServer, Router } from "jszmq";

const router = new Router();
router.bind(new DenoHttpServer("ws://localhost:80"));
```

You can also provide an http server and bind multiple sockets on the same port:

```typescript
import { DenoHttpServer, Pub, Rep } from "jszmq";

const server = new DenoHttpServer("ws://localhost:80");

const rep = new Rep();
const pub = new Pub();

rep.bind(server, "/reqrep");
pub.bind(server, "/pubsub");

await server.listen();
```

### Sending

To send call the send method and provide with either array or a single frame.
Frame can either be Buffer of string, in case of string it would be converted to
Buffer with utf8 encoding.

```typescript
socket.send("Hello"); // Single frame
socket.send(["Hello", "World"]); // Multiple frames
socket.send([Buffer.from("Hello", "utf8")]); // Using Buffer
```

### Receiving

Socket emit messages through the on (and once) methods which listen to `message`
event. Each frame is a parameter to the callback function, all frames are always
instances of Buffer.

```typescript
socket.on("message", (endpoint, msg) => console.log(msg.toString())); // One frame
socket.on(
  "message",
  (endpoint, frame1, frame2) =>
    console.log(frame1.toString(), frame2.toString()),
); // Multiple frames
socket.on(
  "message",
  (endpoint, ...frames) => frames.forEach((f) => console.log(f.toString())),
); // All frames as array
```

## Examples

### Push/Pull

This example demonstrates how a producer pushes information onto a socket and
how a worker pulls information from the socket.

**producer.js**

```typescript
// producer.ts
import { DenoHttpServer, Push } from "jszmq";
const server = new DenoHttpServer("ws://localhost:80");
const sock = new Push();

sock.bind(server);

setInterval(function () {
  console.log("sending work");
  sock.send("some work");
}, 500);
```

**worker.js**

```typescript
// worker.ts
import { Pull } from "jszmq";
const sock = new Pull();

sock.connect("ws://localhost:80");
console.log("Worker connected");

sock.on("message", function (endpoint, msg) {
  console.log("work: %s", msg.toString());
});
```

### Pub/Sub

This example demonstrates using `jszmq` in a classic Pub/Sub,
Publisher/Subscriber, application.

**Publisher: pubber.js**

```typescript
// pubber.ts
import { DenoHttpServer, Pub } from "jszmq";
const server = new DenoHttpServer("ws://localhost:80");
const sock = new Pub();

sock.bind(server);
console.log("Publisher bound.");

setInterval(function () {
  console.log("sending a multipart message envelope");
  sock.send(["kitty cats", "meow!"]);
}, 500);
```

**Subscriber: subber.js**

```typescript
// subber.ts
import { Sub } from "jszmq";

const sock = new Sub();
sock.connect("ws://localhost:80");
sock.subscribe("kitty cats");
console.log("Subscriber connected to port 3000");

sock.on("message", function (endpoint, topic, message) {
  console.log(
    "received a message related to:",
    topic.toString(),
    "containing message:",
    message.toString(),
  );
});
```
