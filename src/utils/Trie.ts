import { assert } from "https://deno.land/std@0.106.0/testing/asserts.ts";
import { Buffer } from "../Types.ts";
import { resize } from "./array.ts";

type ForeachCallback = (buffer: Buffer) => void;

export class Trie {
  #referenceCount: number;
  #minCharacter: number;
  #count: number;
  #liveNodes: number;
  #next: Array<Trie | null>;

  public constructor() {
    this.#referenceCount = 0;
    this.#minCharacter = 0;
    this.#count = 0;
    this.#liveNodes = 0;
    this.#next = [];
  }

  public get isRedundant(): boolean {
    return this.#referenceCount === 0 && this.#liveNodes === 0;
  }

  public add(prefix: Buffer, start: number, size: number): boolean {
    // We are at the node corresponding to the prefix. We are done.
    if (size === 0) {
      this.#referenceCount++;
      return this.#referenceCount === 1;
    }

    const currentCharacter = prefix.readUInt8(start);
    if (
      currentCharacter < this.#minCharacter ||
      currentCharacter >= this.#minCharacter + this.#count
    ) {
      // The character is out of range of currently handled
      // characters. We have to extend the table.
      if (this.#count === 0) {
        this.#minCharacter = currentCharacter;
        this.#count = 1;
        this.#next = Array(1).fill(null);
      } else if (this.#count === 1) {
        const oldc = this.#minCharacter;
        const oldp = this.#next[0];

        this.#count = (this.#minCharacter < currentCharacter
          ? currentCharacter - this.#minCharacter
          : this.#minCharacter - currentCharacter) + 1;
        this.#next = Array(this.#count).fill(null);
        this.#minCharacter = Math.min(
          this.#minCharacter,
          currentCharacter,
        );
        this.#next[oldc - this.#minCharacter] = oldp;
      } else if (this.#minCharacter < currentCharacter) {
        // The new character is above the current character range.
        this.#count = currentCharacter - this.#minCharacter + 1;
        this.#next = resize(this.#next, this.#count, true);
      } else {
        // The new character is below the current character range.
        this.#count = this.#minCharacter + this.#count - currentCharacter;
        this.#next = resize(this.#next, this.#count, false);
        this.#minCharacter = currentCharacter;
      }
    }

    if (this.#next[currentCharacter - this.#minCharacter] === null) {
      this.#next[currentCharacter - this.#minCharacter] = new Trie();
      this.#liveNodes++;
    }

    return (
      this.#next[currentCharacter - this.#minCharacter]?.add(
        prefix,
        start + 1,
        size - 1,
      ) ?? false
    );
  }

  public remove(prefix: Buffer, start: number, size: number): boolean {
    if (size === 0) {
      if (this.#referenceCount === 0) {
        return false;
      }
      this.#referenceCount--;
      return this.#referenceCount === 0;
    }

    const currentCharacter = prefix.readUInt8(start);
    if (
      this.#count === 0 ||
      currentCharacter < this.#minCharacter ||
      currentCharacter >= this.#minCharacter + this.#count
    ) {
      return false;
    }

    const nextNode = this.#count === 1
      ? this.#next[0]
      : this.#next[currentCharacter - this.#minCharacter];

    if (nextNode === null) {
      return false;
    }

    const wasRemoved = nextNode.remove(prefix, start + 1, size - 1);

    if (nextNode.isRedundant) {
      if (this.#count === 1) {
        this.#next = [];
        this.#count = 0;
        this.#liveNodes--;
        assert(this.#liveNodes === 0);
      } else {
        this.#next[currentCharacter - this.#minCharacter] = null;
        assert(this.#liveNodes > 1);
        this.#liveNodes--;

        if (currentCharacter === this.#minCharacter) {
          // We can compact the table "from the left"
          let newMin = this.#minCharacter;
          for (let i = 1; i < this.#count; ++i) {
            if (this.#next[i] !== null) {
              newMin = i + this.#minCharacter;
              break;
            }
          }
          assert(newMin !== this.#minCharacter);
          assert(newMin > this.#minCharacter);
          assert(this.#count > newMin - this.#minCharacter);

          this.#count = this.#count - (newMin - this.#minCharacter);
          this.#next = resize(this.#next, this.#count, false);

          this.#minCharacter = newMin;
        } else if (
          currentCharacter ===
            this.#minCharacter + this.#count - 1
        ) {
          // We can compact the table "from the right"
          let newCount = this.#count;
          for (let i = 1; i < this.#count; i++) {
            if (this.#next[this.#count - 1 - i] != null) {
              newCount = this.#count - i;
              break;
            }
          }
          assert(newCount !== this.#count);
          this.#count = newCount;

          this.#next = resize(this.#next, this.#count, true);
        }
      }
    }

    return wasRemoved;
  }

  public check(
    data: Buffer,
    offset: number,
    size: number,
  ): boolean | undefined {
    // This function is on critical path. It deliberately doesn't use
    // recursion to get a bit better performance.
    // deno-lint-ignore no-this-alias
    let current: Trie | null = this;
    let start = offset;
    while (current) {
      // We've found a corresponding subscription!
      if (current.#referenceCount > 0) {
        return true;
      }

      // We've checked all the data and haven't found matching subscription.
      if (size === 0) {
        return false;
      }

      // If there's no corresponding slot for the first character
      // of the prefix, the message does not match.
      const character = data.readUInt8(start);
      if (
        character < current.#minCharacter ||
        character >= current.#minCharacter + current.#count
      ) {
        return false;
      }

      // Move to the next character.
      if (current.#count === 1) {
        current = current.#next[0];
      } else {
        current = current.#next[character - current.#minCharacter];

        if (current === null) {
          return false;
        }
      }
      start++;
      size--;
    }
  }

  // Apply the function supplied to each subscription in the trie.
  public forEach(func: ForeachCallback): void {
    this.forEachHelper(Buffer.alloc(0), 0, 0, func);
  }

  public forEachHelper(
    buffer: Buffer,
    bufferSize: number,
    maxBufferSize: number,
    func: ForeachCallback,
  ): void {
    // If this node is a subscription, apply the function.
    if (this.#referenceCount > 0) {
      func(buffer.slice(0, bufferSize));
    }

    // Adjust the buffer.
    if (bufferSize >= maxBufferSize) {
      maxBufferSize = bufferSize + 256;
      const newBuffer = Buffer.alloc(maxBufferSize, 0);
      buffer.copy(newBuffer);
      buffer = newBuffer;
    }

    // If there are no subnodes in the trie, return.
    if (this.#count === 0) {
      return;
    }

    // If there's one subnode (optimization).
    if (this.#count === 1) {
      buffer[bufferSize] = this.#minCharacter;
      bufferSize++;

      this.#next[0]?.forEachHelper(
        buffer,
        bufferSize,
        maxBufferSize,
        func,
      );
      return;
    }

    // If there are multiple subnodes.
    for (let c = 0; c !== this.#count; c++) {
      buffer.writeUInt8(this.#minCharacter + c, bufferSize);
      if (this.#next[c] != null) {
        this.#next[c]?.forEachHelper(
          buffer,
          bufferSize + 1,
          maxBufferSize,
          func,
        );
      }
    }
  }
}
