/// <reference types="node" />
import { describe, test, expect, afterAll } from "vitest";
import format from "./format";
import { mixin } from "../../../release";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

// pd: classes
class X {
  static readonly Initial = 10;

  x = X.Initial;

  shared = true as boolean;

  getValue() {
    return this.x;
  }
}

class Y {
  static readonly Initial = 20;

  y = Y.Initial;

  shared = true;

  getValue() {
    return this.y;
  }
}

class Standard implements X, Y {
  x = X.Initial;
  y = Y.Initial;

  shared = true;

  getValue() {
    return this.x + this.y;
  }
}

class InheritX extends X {
  y = Y.Initial;

  getValue() {
    return this.x + this.y;
  }
}

class ManualComposition {
  _x = new X();
  _y = new Y();

  get x() {
    return this._x.x;
  }
  set x(value) {
    this._x.x = value;
  }

  get y() {
    return this._y.y;
  }

  set y(value) {
    this._y.y = value;
  }

  get shared() {
    return this._x.shared && this._y.shared;
  }

  set shared(value: boolean) {
    this._x.shared = value;
    this._y.shared = value;
  }

  getValue() {
    return this._x.getValue() + this._y.getValue();
  }
}

class SimpleMixed extends mixin([X, Y], {
  shared: X,
  getValue: Y,
}) {}

class CustomMixed extends mixin([X, Y], {
  shared: null,
  getValue: [
    X,
    Y,
    (_, __, instance) => instance(X).getValue() + instance(Y).getValue(),
  ],
}) {
  get shared() {
    return this[0].shared && this[1].shared;
  }

  set shared(value: boolean) {
    this[0].shared = value;
    this[1].shared = value;
  }
}
// pd: classes

const defaultIterations = 1000000;
const defaultWarmup = 1000;

const benchmark = <T>(
  fn: () => T,
  iterations: number = defaultIterations,
  warmup = defaultWarmup
) => {
  for (let i = 0; i < warmup; i++) fn();

  const start = performance.now();
  const initial = fn();
  for (let i = 0; i < iterations - 2; i++) fn();
  const final = fn();
  const elapsed = performance.now() - start;

  return { initial, final, elapsed };
};

const classes = [
  Standard,
  InheritX,
  ManualComposition,
  SimpleMixed,
  CustomMixed,
];
const instances = () => classes.map((cls) => [cls, new cls()] as const);

interface BenchmarkResult {
  category: string;
  class: string;
  elapsed: number;
  relative: number;
}

const performanceResults: BenchmarkResult[] = [];

const comparer = <T extends new (...args: any[]) => any = typeof Standard>(
  standard?: T,
  category?: string
) => {
  const elapsedByClass = new Map<(typeof classes)[number], number>();
  return {
    store: (cls: (typeof classes)[number], elapsed: number) =>
      elapsedByClass.set(cls, elapsed),
    report: () => {
      const Yardstick = standard ?? Standard;
      const yardstick = elapsedByClass.get(Yardstick)!;
      console.log(
        `Performance Comparison: (relative to: ${format(
          "blue"
        )`${yardstick.toFixed(2)}ms`})`
      );

      for (const [cls, elapsed] of elapsedByClass) {
        const relative = elapsed / yardstick;
        if (category) {
          performanceResults.push({
            category,
            class: cls.name,
            elapsed,
            relative,
          });
        }
        if (cls === Yardstick) continue;
        console.log(
          format("tab")`${cls.name}: ${elapsed.toFixed(2)}ms (${format(
            "red"
          )`${relative.toFixed(2)}`}x of ${Yardstick.name})`
        );
      }
    },
  };
};

describe("Performance: Property Access (x)", () => {
  test("non-conflicting property access", () => {
    console.log(`Property Access (x)`);
    const compare = comparer(undefined, "Property Access (x)");
    for (const [cls, instance] of instances()) {
      const result = benchmark(() => instance.x);
      expect(result.initial).toBe(X.Initial);
      expect(result.final).toBe(X.Initial);
      compare.store(cls, result.elapsed);
    }
    compare.report();
  });
});

describe("Performance: Method Calls (getValue)", () => {
  test("method calls on conflicting property", () => {
    console.log(`Method Calls (getValue)`);
    const compare = comparer(undefined, "Method Calls (getValue)");
    for (const [cls, instance] of instances()) {
      const result = benchmark(() => instance.getValue());
      const expected = cls === SimpleMixed ? Y.Initial : X.Initial + Y.Initial;
      expect(result.initial).toBe(expected);
      expect(result.final).toBe(expected);
      compare.store(cls, result.elapsed);
    }
    compare.report();
  });
});

describe("Performance: Instance Creation", () => {
  test("instance creation", () => {
    console.log(`Instance Creation`);
    const compare = comparer(undefined, "Instance Creation");
    for (const cls of classes) {
      const result = benchmark(() => new cls());
      expect(result.initial).toBeInstanceOf(cls);
      expect(result.final).toBeInstanceOf(cls);
      compare.store(cls, result.elapsed);
    }
    compare.report();
  });
});

describe("Performance: Property Mutation", () => {
  test("non-conflicting property mutations", () => {
    console.log(`Property Mutation (x, y)`);
    const compare = comparer(undefined, "Property Mutation (x, y)");
    for (const [cls, instance] of instances()) {
      const x = X.Initial + 10;
      const y = Y.Initial + 5;
      const result = benchmark(() => {
        instance.x = x;
        instance.y = y;
      });
      expect(instance.x).toBe(x);
      expect(instance.y).toBe(y);
      compare.store(cls, result.elapsed);
    }
    compare.report();
  });

  test("conflicting property mutations", () => {
    console.log(`Property Mutation (shared)`);
    const compare = comparer(undefined, "Property Mutation (shared)");
    for (const [cls, instance] of instances()) {
      const result = benchmark(() => {
        instance.shared = false;
      });
      expect(instance.shared).toBe(false);
      compare.store(cls, result.elapsed);
    }
    compare.report();
  });
});

describe("Performance: Instance Access", () => {
  test("nested instance access", () => {
    const simple = new SimpleMixed();
    const custom = new CustomMixed();
    const manual = new ManualComposition();

    const manualAccess = benchmark(() => manual._x);
    expect(manualAccess.final).toBeInstanceOf(X);

    const indexComparer = comparer(
      ManualComposition,
      "Instance Access (by index)"
    );
    indexComparer.store(ManualComposition, manualAccess.elapsed);

    const simpleIndex = benchmark(() => simple[0]);
    expect(simpleIndex.final).toBeInstanceOf(X);
    indexComparer.store(SimpleMixed, simpleIndex.elapsed);

    const customIndex = benchmark(() => custom[0]);
    expect(customIndex.final).toBeInstanceOf(X);
    indexComparer.store(CustomMixed, customIndex.elapsed);

    console.log("Instance Access (by index)");
    indexComparer.report();

    const instanceComparer = comparer(
      ManualComposition,
      "Instance Access (by instance method)"
    );
    instanceComparer.store(ManualComposition, manualAccess.elapsed);

    const simpleInstance = benchmark(() => simple.instance(X));
    expect(simpleInstance.final).toBeInstanceOf(X);
    instanceComparer.store(SimpleMixed, simpleInstance.elapsed);

    const customInstance = benchmark(() => custom.instance(X));
    expect(customInstance.final).toBeInstanceOf(X);
    instanceComparer.store(CustomMixed, customInstance.elapsed);

    console.log("Instance Access (by instance method)");
    instanceComparer.report();
  });
});

afterAll(() => {
  // Generate markdown table
  const markdown: string[] = [
    "# Performance Benchmarks",
    "",
    "Below is a erformance comparison of mixin-suede against standard JavaScript patterns.",
    "",
    `All benchmarks run ${defaultIterations} iterations (after ${defaultWarmup} warmup iterations). Values shown are execution time in milliseconds and relative performance compared to the baseline (Standard class, or ManualComposition for instance access).`,
    "",
    "[](./performance.test.ts?region=include(classes)&wrap=dropdown(See-test-classes.))",
  ];

  // Group results by category
  const categories = [...new Set(performanceResults.map((r) => r.category))];

  for (const category of categories) {
    const categoryResults = performanceResults.filter(
      (r) => r.category === category
    );

    markdown.push(`## ${category}`, "");
    markdown.push("| Class | Time (ms) | Relative Performance |");
    markdown.push("|-------|-----------|---------------------|");

    for (const result of categoryResults) {
      markdown.push(
        `| ${result.class} | ${result.elapsed.toFixed(
          2
        )} | ${result.relative.toFixed(2)}x slower |`
      );
    }

    markdown.push("");
  }

  markdown.push(
    "---",
    "",
    `*Benchmarks generated on ${new Date().toISOString()}*`
  );

  const outputPath = join(__dirname, "PERFORMANCE.md");
  writeFileSync(outputPath, markdown.join("\n"), "utf-8");
  console.log(`\n✓ Performance results written to ${outputPath}`);
});
