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

  test("Plugin system with shared interface", () => {
    // Demonstrate: composing multiple plugins that implement the same interface
    class AudioPlugin {
      name = "audio";
      process(input: string) {
        return `[AUDIO] ${input}`;
      }
    }

    class VideoPlugin {
      name = "video";
      process(input: string) {
        return `[VIDEO] ${input}`;
      }
    }

    class FilterPlugin {
      name = "filter";
      process(input: string) {
        return `[FILTER] ${input}`;
      }
    }

    class MultiProcessor extends mixin(
      [AudioPlugin, VideoPlugin, FilterPlugin],
      {
        process: [
          AudioPlugin,
          VideoPlugin,
          FilterPlugin,
          (audioInput, videoInput, filterInput, instance) => {
            // Each plugin receives its dedicated input parameter
            const audio = instance(AudioPlugin).process(...audioInput);
            const video = instance(VideoPlugin).process(...videoInput);
            const filtered = instance(FilterPlugin).process(...filterInput);
            return `${audio} -> ${video} -> ${filtered}`;
          },
        ],
        name: AudioPlugin, // Use the first plugin's name
      }
    ) {}

    const processor = new MultiProcessor();
    expect(processor.name).toBe("audio");
    expect(
      processor.process(["audio-data"], ["video-data"], ["filter-data"])
    ).toBe("[AUDIO] audio-data -> [VIDEO] video-data -> [FILTER] filter-data");
  });

  test("Plugin system with shared interface and resolver", () => {
    // Demonstrate: composing multiple plugins that implement the same interface
    class AudioPlugin {
      name = "audio";
      process(input: string) {
        return `[AUDIO] ${input}`;
      }
    }

    class VideoPlugin {
      name = "video";
      process(input: string) {
        return `[VIDEO] ${input}`;
      }
    }

    class FilterPlugin {
      name = "filter";
      process(input: string) {
        return `[FILTER] ${input}`;
      }
    }

    class MultiProcessor extends mixin(
      [AudioPlugin, VideoPlugin, FilterPlugin],
      ({ process }) => ({
        ...process(AudioPlugin, (input, instance) => {
          const audio = instance(AudioPlugin).process(input);
          const video = instance(VideoPlugin).process(input);
          const filtered = instance(FilterPlugin).process(input);
          return `${audio} -> ${video} -> ${filtered}`;
        }),
        name: VideoPlugin,
      })
    ) {}

    const processor = new MultiProcessor();
    expect(processor.name).toBe("video");
    expect(processor.process("generic-data")).toBe(
      "[AUDIO] generic-data -> [VIDEO] generic-data -> [FILTER] generic-data"
    );
  });

  test("Multiple independent features", () => {
    // Demonstrate: composing classes with completely different responsibilities
    class Logger {
      logs: string[] = [];

      log(message: string) {
        this.logs.push(message);
      }

      getLogs() {
        return this.logs;
      }
    }

    class Timer {
      startTime: number = 0;

      start() {
        this.startTime = Date.now();
      }

      elapsed() {
        return Date.now() - this.startTime;
      }
    }

    class Counter {
      count: number = 0;

      increment() {
        this.count++;
      }

      decrement() {
        this.count--;
      }

      getCount() {
        return this.count;
      }
    }

    class ComprehensiveService extends mixin([Logger, Timer, Counter]) {}

    const service = new ComprehensiveService();

    service.log("Starting");
    service.start();
    service.increment();
    service.increment();

    expect(service.getCount()).toBe(2);
    expect(service.getLogs()).toContain("Starting");
    expect(service.elapsed()).toBeGreaterThanOrEqual(0);
  });

  test("Omitting properties to create clean interface", () => {
    // Demonstrate: removing internal properties to expose only public API
    class DataStore {
      private _cache: Map<string, any> = new Map();

      get cache() {
        return this._cache;
      }

      get(key: string) {
        return this._cache.get(key);
      }

      set(key: string, value: any) {
        this._cache.set(key, value);
      }
    }

    class EventEmitter {
      private _listeners: Map<string, Function[]> = new Map();

      get listeners() {
        return this._listeners;
      }

      on(event: string, callback: Function) {
        if (!this._listeners.has(event)) {
          this._listeners.set(event, []);
        }
        this._listeners.get(event)!.push(callback);
      }
    }

    class Store extends mixin([DataStore, EventEmitter], {
      cache: null, // Hide internal cache property
      listeners: null, // Hide internal listeners property
    }) {}

    const store = new Store();
    store.set("user", { name: "Alice" });
    expect(store.get("user")).toEqual({ name: "Alice" });

    // @ts-expect-error - cache should not be accessible
    const _ = store.cache;

    // @ts-expect-error - listeners should not be accessible
    const __ = store.listeners;
  });

  test("Constructor parameter composition", () => {
    // Demonstrate: passing different parameters to each mixed class

    class Rectangle {
      readonly width: number;
      readonly height: number;
      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
      }

      area() {
        return this.width * this.height;
      }
    }

    class Triangle {
      readonly base: number;
      readonly height: number;

      constructor(base: number, height: number) {
        this.base = base;
        this.height = height;
      }

      area() {
        return (this.base * this.height) / 2;
      }
    }

    class ShapeCalculator extends mixin([Rectangle, Triangle], {
      height: null,
      area: [
        Rectangle,
        Triangle,
        (_, __, instance) => {
          return instance(Rectangle).area() + instance(Triangle).area();
        },
      ],
    }) {}

    const calc = new ShapeCalculator([4, 5], [3, 6]);
    // Rectangle area: 4 * 5 = 20
    // Triangle area: (3 * 6) / 2 = 9
    // Total: 29
    expect(calc.area()).toBe(29);
  });

  test("Instance method access via instance() helper", () => {
    // Demonstrate: accessing individual mixed instances for direct manipulation
    class AccountManager {
      balance: number = 0;

      deposit(amount: number) {
        this.balance += amount;
      }

      withdraw(amount: number) {
        this.balance -= amount;
      }
    }

    class AuditLog {
      entries: string[] = [];

      log(message: string) {
        this.entries.push(message);
      }
    }

    class SecureAccount extends mixin([AccountManager, AuditLog]) {}

    const account = new SecureAccount();
    account.deposit(100);
    account.withdraw(30);

    // Access the individual instances
    const accountManager = account.instance(AccountManager);
    const auditLog = account.instance(AuditLog);

    expect(accountManager.balance).toBe(70);
    expect(auditLog.entries).toHaveLength(0); // No logging setup in this test
  });

  test("No conflicts - all different properties", () => {
    // Demonstrate: simple composition when classes have no overlapping properties
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

    class Resizable {
      resize() {
        return "resizing";
      }
    }

    // No conflicts parameter needed when there are no overlapping properties
    class GameObject extends mixin([Drawable, Movable, Resizable]) {}

    const obj = new GameObject();
    expect(obj.draw()).toBe("drawing");
    expect(obj.move()).toBe("moving");
    expect(obj.resize()).toBe("resizing");
  });

  test("Numeric indexed access to mixed instances", () => {
    // Demonstrate: accessing mixed instances by numeric index
    class First {
      id = "first";
    }

    class Second {
      id = "second";
    }

    class Third {
      id = "third";
    }

    class Triple extends mixin([First, Second, Third], { id: null }) {}

    const triple = new Triple();

    // Access by numeric index (0-based)
    expect(triple[0].id).toBe("first");
    expect(triple[1].id).toBe("second");
    expect(triple[2].id).toBe("third");

    // Same as using instance() helper
    expect(triple.instance(First).id).toBe("first");
    expect(triple.instance(Second).id).toBe("second");
    expect(triple.instance(Third).id).toBe("third");
  });
});
