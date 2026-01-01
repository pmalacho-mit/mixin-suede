import { describe, test, expect, expectTypeOf } from "vitest";
import { mixin } from "../release";

describe("My Test Suite", () => {
  test("Handle readonly / mutable property correctly", () => {
    class A {
      readonly dummy: string = "constant";
    }

    class B {
      dummy: string = "mutable";
    }

    class MixedA extends mixin([A, B], {
      dummy: A,
    }) {}

    const a = new MixedA();
    // @ts-expect-error
    a.dummy = "changed";

    class MixedB extends mixin([A, B], {
      dummy: B,
    }) {}

    const b = new MixedB();
    b.dummy = "changed"; // This should not error!
  });

  test("Take implementation from specific class", () => {
    class Alpha {
      value: string;
      constructor(value: string) {
        this.value = value;
      }

      getValue() {
        return `Alpha: ${this.value}`;
      }
    }

    class Beta {
      value: string;
      constructor(value: string) {
        this.value = value;
      }

      getValue() {
        return `Beta: ${this.value}`;
      }
    }

    class Mixed extends mixin([Alpha, Beta], {
      value: null, // Omit conflicting property
      getValue: Alpha,
    }) {}

    const mixedInstance = new Mixed(["hello"], ["world"]);

    // @ts-expect-error
    const _ = mixedInstance.value; // 'value' should be omitted

    expect(mixedInstance.getValue()).toBe("Alpha: hello");
  });

  test("Merge implementations", () => {
    class Circle {
      radius: number;
      constructor(radius: number) {
        this.radius = radius;
      }

      area() {
        return Math.PI * this.radius * this.radius;
      }
    }

    class Square {
      side: number;
      constructor(side: number) {
        this.side = side;
      }

      area() {
        return this.side * this.side;
      }
    }

    class CircleSquare extends mixin([Circle, Square], {
      area: [
        Circle,
        Square,
        (_, __, instance) => {
          return instance(Circle).area() + instance(Square).area();
        },
      ],
    }) {}

    let radius = 3;
    let side = 4;
    const shape = new CircleSquare([radius], [side]);

    const expectedArea = () => Math.PI * radius * radius + side * side;

    expect(shape.area()).toBeCloseTo(expectedArea());

    expect(shape.instance(Circle)).toBeInstanceOf(Circle);
    expect(shape.instance(Square)).toBeInstanceOf(Square);
    expect(shape[0]).toBeInstanceOf(Circle);
    expect(shape[1]).toBeInstanceOf(Square);

    shape.radius = radius = 10;
    shape.side = side = 5;

    expect(shape[0].radius).toBe(10);
    expect(shape[1].side).toBe(5);

    expect(shape.area()).toBeCloseTo(expectedArea());
  });

  test("Merge implementation with 'resolver' function", () => {
    class Red {
      value: number = 255;

      saturate(factor: number) {
        this.value = Math.min(255, this.value + factor);
      }
    }

    class Green {
      value: number = 255;

      saturate(factor: number) {
        this.value = Math.min(255, this.value + factor);
      }
    }

    class Blue {
      value: number = 255;

      saturate(factor: number) {
        this.value = Math.min(255, this.value + factor);
      }
    }

    class RedderColor extends mixin(
      [Red, Green, Blue],
      ({ saturate, value }) => ({
        ...value(
          Red,
          Green,
          Blue,
          (_, __, ___, instance) =>
            (instance(Red).value << 16) |
            (instance(Green).value << 8) |
            instance(Blue).value
        ),
        ...saturate(Red, Green, Blue, (red, green, blue, instance) => {
          let [r, g, b] = [red, green, blue].flat();
          g = Math.min(r, g);
          b = Math.min(g, b);

          instance(Red).saturate(r);
          instance(Green).saturate(g);
          instance(Blue).saturate(b);
        }),
      })
    ) {}

    const color = new RedderColor();

    expect(color.value()).toBe(0xffffff);

    color.saturate([10], [20], [30]);
  });

  test("Getter exploration", () => {
    class Value {
      prop: string = "X";
    }

    class Getter {
      private _prop: string = "Y";

      get prop() {
        return this._prop;
      }
    }

    class UseGetter extends mixin([Value, Getter], {
      prop: Getter,
    }) {}

    const a = new UseGetter();
    expect(a.prop).toBe("Y");

    class UseGetterFunction extends mixin([Value, Getter], {
      prop: [
        Getter,
        (_, instance) => {
          return `Custom: ${instance(Getter).prop}`;
        },
      ],
    }) {}

    const b = new UseGetterFunction();
    expectTypeOf<typeof b.prop>().toEqualTypeOf<() => string>();
    expect(b.prop()).toBe("Custom: Y");
  });
});
