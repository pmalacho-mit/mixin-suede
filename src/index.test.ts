import { describe, test, expect } from "vitest";
import { mixin } from "../release";

describe("My Test Suite", () => {
  test("My Test Case", () => {
    class A {
      a: number;
      test(name: string) {
        return "Hello, " + name + "! From A";
      }
      constructor(x: number) {
        this.a = x;
      }
    }

    class B {
      b: string;
      c: string;
      test = "B";
      constructor(hello: string, world: string) {
        this.b = hello;
        this.c = world;
      }
    }

    class C {
      d: boolean = true;
      constructor() {}
    }

    // No conflicts in A, B, C => we don’t need a conflict map
    class Mixed extends mixin(A, B, C, {
      /* Option 1:
      [This currently works!]
      Basic conflict resolution. Simply use 'A'’s version of 'test'.
      The mixin's type of 'test' is simple A's type of test. */
      test: A,

      /* TODO Option 2:
      Conflict resolution by leveraging multiple classe's implementation of the conflicting key (i.e. 'test' of `A` here).
      Considering the leading elements of the tuple the "Classes" and the final element the "Function".
      The Function provided as the last index of the tuple must receive:
      - as the leading arguments, the arguments tuples for the 'test' property of the provided "Classes" (type is `null | undefined ` if method takes no arguemnts, or if the property is not a method).
      - as the final argument, a map-like object that maps each mixed‑in class to its instance (i.e. instances.get(A) is the instance of A, instances.get(B) is the instance of B, etc. Ideally, I'd like to access by `instance[A]` but I don't think that's possible).
        - NOTE: instances contains all mixed-in class instances, so you can access other classes' instances if needed. In this way, providing classes as the leading arguments of the tuple is used to define the arguments of the mixin's 'test' property.
      Whatever it returns becomes the return type of the mixin's 'test' property (async is allowed).
      The arguments of the mixin's 'test' method match the types of the leading arguments to Function (e.g. `...[a, b]` below).
      so on the mixin instance, the type of test looks like:
      ```
      test(...args: [[name: string], null | undefined]): number;
      ```

      and invoking it looks like:
      const mixied = new Mixed(...);
      mixied.test(["world"], null);
       */
      test: [
        A,
        B,
        (a, b, instances) =>
          instances.get(A).test(...a).length + instances.get(B).test.length,
      ],
    }) {
      constructor() {
        // Provide one argument tuple per mixed class; use `null` for zero‑argument classes
        super([0], ["ahoy", "matey"], null);
      }
    }

    const m = new Mixed();

    expect(m.a).toBe(0);
    expect(m.b).toBe("ahoy");
    expect(m.c).toBe("matey");
    expect(m.d).toBe(true);
    expect(m.test("world")).toBe("Hello, world! From A"); // Assuming Option 1
    expect(m.test(["world"], null)).toBe(
      "Hello, world! From A".length + "B".length
    ); // Assuming Option 2
  });
});
