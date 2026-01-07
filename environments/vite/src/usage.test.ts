import { describe, expect, expectTypeOf, test } from "vitest";
// pd: import
import { mixin } from "../../../release";
// pd: import
import type { Expand } from "../../../release/utils";

// pd: newline

// pd: newline

describe("documentation tests", () => {
  test("basic", () => {
    // pd: basic
    class Drawable {
      draw() {
        return "drawing";
      }
    }

    class Movable {
      move() {
        return "moving";
      }
    }

    class GameObject extends mixin([Drawable, Movable]) {}

    const obj = new GameObject();
    obj.draw(); // "drawing"
    obj.move(); // "moving"
    // pd: basic

    expect(obj.draw()).toBe("drawing");
    expect(obj.move()).toBe("moving");
  });

  test("constructors", () => {
    // pd: constructors
    class Rectangle {
      width: number;
      height: number;

      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
      }

      area() {
        return this.width * this.height;
      }
    }

    class Color {
      hex: string;
      constructor(hex: string) {
        this.hex = hex;
      }
    }

    class ColoredRectangle extends mixin([Rectangle, Color]) {}

    // Pass parameters as separate arrays for each class
    const rect = new ColoredRectangle([10, 5], ["#ff0000"]);
    rect.width; // 10
    rect.hex; // "#ff0000"
    rect.area(); // 50
    // pd: constructors

    expect(rect.width).toBe(10);
    expect(rect.hex).toBe("#ff0000");
    expect(rect.area()).toBe(50);
  });

  describe("conflict resolution", () => {
    // pd: simple-classes
    class Alpha {
      getValue() {
        return "Alpha" as const;
      }
    }

    class Beta {
      getValue() {
        return "Beta" as const;
      }
    }
    // pd: simple-classes

    test("inherit", () => {
      // pd: resolve-inherit
      class Mixed extends mixin([Alpha, Beta], {
        getValue: Beta, // Use Beta's implementation
      }) {}

      const mixed = new Mixed();
      const result: "Beta" = mixed.getValue();
      // pd: resolve-inherit

      expect(mixed.getValue()).toBe("Beta");
      expectTypeOf(result).toEqualTypeOf<"Beta">();
    });

    test("omit", () => {
      // pd: resolve-omit
      class Mixed extends mixin([Alpha, Beta], {
        getValue: null,
      }) {}

      const mixed = new Mixed();
      const hasGetValue = "getValue" in mixed; // false
      // pd: resolve-omit

      expect(hasGetValue).toBe(false);
      expectTypeOf<
        "getValue" extends keyof typeof mixed ? true : false
      >().toEqualTypeOf<false>();
    });

    test("override", () => {
      // pd: resolve-override
      class Mixed extends mixin([Alpha, Beta], {
        getValue: null,
      }) {
        getValue<T extends string>(delimiter: T) {
          const alpha = this.instance(Alpha); // use `instance` to access Alpha
          const beta = this[1]; // use index to access Beta, corresponding to its position in the mixin array
          const a = alpha.getValue();
          const b = beta.getValue();
          return `${a}${delimiter}${b}` as const;
        }
      }

      const mixed = new Mixed();
      const result: "Alpha-Beta" = mixed.getValue("-");
      // pd: resolve-override

      expect(result).toBe("Alpha-Beta");
      expectTypeOf(result).toEqualTypeOf<"Alpha-Beta">();
    });

    // pd: complex-classes
    class A {
      example() {
        return "A" as const;
      }
    }

    class B {
      example = 5 as const;
    }

    class C {
      example(x: number, y: number) {
        return x + y;
      }
    }
    // pd: complex-classes

    const expectation = (result: `A-5-${number}`) =>
      expect(result).toBe("A-5-3");

    test("complex resolution: tuple", () => {
      // pd: resolve-complex-tuple
      class Mixed extends mixin([A, B, C], {
        example: [
          A,
          B,
          C,
          (argsA, argsB, argsC, instance) => {
            const a: null | undefined = argsA; // since A.example is a method with no parameters
            const b: null | undefined = argsB; // since B.example is a property
            const c: [number, number] = argsC; // since C.example takes two number parameters

            const exampleA = instance(A).example();
            const exampleB = instance(B).example;
            const exampleC = instance(C).example(...argsC);

            return `${exampleA}-${exampleB}-${exampleC}` as const;
          },
        ],
      }) {}

      const mixed = new Mixed();
      const result: `A-5-${number}` = mixed.example(null, null, [1, 2]); // "A-5-3"
      // pd: resolve-complex-tuple
      expectation(result);
    });

    test("complex resolution: resolver-2-classes", () => {
      // pd: resolver-2-classes
      class Mixed extends mixin([A, B, C], (resolve) => ({
        ...resolve.example(A, C, (argsA, argsC, instance) => {
          const a: null | undefined = argsA; // since A.example is a method with no parameters
          const c: [number, number] = argsC; // since C.example takes two number parameters

          const exampleA = instance(A).example();
          const exampleB = instance(B).example;
          const exampleC = instance(C).example(...argsC);

          return `${exampleA}-${exampleB}-${exampleC}` as const;
        }),
      })) {}

      const mixed = new Mixed();
      const result: `A-5-${number}` = mixed.example(null, [1, 2]); // "A-5-3"
      // pd: resolver-2-classes

      expectation(result);
    });

    test("complex resolution: resolver-1-class", () => {
      // pd: resolver-1-class
      class Mixed extends mixin([A, B, C], (resolve) => ({
        ...resolve.example(C, (x, y, instance) => {
          const exampleA = instance(A).example();
          const exampleB = instance(B).example;
          const exampleC = instance(C).example(x, y);

          return `${exampleA}-${exampleB}-${exampleC}` as const;
        }),
      })) {}

      const mixed = new Mixed();
      const result: `A-5-${number}` = mixed.example(1, 2); // "A-5-3"
      // pd: resolver-1-class

      expectation(result);
    });

    test("complex resolution: no-class", () => {
      // pd: resolver-no-class
      class Mixed extends mixin([A, B, C], (resolve) => ({
        // specify null to indicate no class inheritance in signature
        ...resolve.example(null, (instance) => {
          const exampleA = instance(A).example();
          const exampleB = instance(B).example;
          const exampleC = instance(C).example(1, 2);
          return `${exampleA}-${exampleB}-${exampleC}` as const;
        }),
      })) {}

      const mixed = new Mixed();
      const result: `A-5-${number}` = mixed.example(); // "A-5-3"
      // pd: resolver-no-class

      expectation(result);
    });
  });

  test("access", () => {
    // pd: #access
    class Logger {
      logs: string[] = [];
      log(message: string) {
        this.logs.push(message);
      }
    }

    class Timer {
      startTime: number = 0;
      start() {
        this.startTime = Date.now();
      }
    }

    class Service extends mixin([Logger, Timer]) {}

    const service = new Service();

    // Access via instance() method
    const logger = service.instance(Logger);
    logger.logs; // string[]

    // Access via numeric index
    service[0]; // Logger instance
    service[1]; // Timer instance
    // pd: #access

    expect(logger).toBeInstanceOf(Logger);
    expect(logger.logs).toEqual([]);
    expect(service[0]).toBeInstanceOf(Logger);
    expect(service[1]).toBeInstanceOf(Timer);
  });

  test("mutability", () => {
    // pd: mutability
    class ReadonlyValue {
      readonly value: string = "constant";
    }

    class MutableValue {
      value: string = "mutable";
    }

    class MixedReadonly extends mixin([ReadonlyValue, MutableValue], {
      value: ReadonlyValue,
    }) {}

    const a = new MixedReadonly();
    // @ts-expect-error - NOTE: this is ONLY a type error, at runtime this will succeed
    a.value = "changed";

    class MixedMutable extends mixin([ReadonlyValue, MutableValue], {
      value: MutableValue,
    }) {}

    const b = new MixedMutable();
    b.value = "changed"; // OK - mutable
    // pd: mutability

    expectTypeOf<Pick<Expand<typeof a>, "value">>().toEqualTypeOf<{
      readonly value: string;
    }>();
    expectTypeOf<Pick<Expand<typeof a>, "value">>().not.toEqualTypeOf<{
      value: string;
    }>();

    expectTypeOf<Pick<Expand<typeof b>, "value">>().toEqualTypeOf<{
      value: string;
    }>();
    expectTypeOf<Pick<Expand<typeof b>, "value">>().not.toEqualTypeOf<{
      readonly value: string;
    }>();

    expect(a.value).toBe("changed");
    expect(b.value).toBe("changed");
  });
});
