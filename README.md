# Mixin-suede

A powerful TypeScript mixin utility with full type safety and flexible conflict resolution.

This repo is a [suede dependency](https://github.com/pmalacho-mit/suede).

To see the installable source code, please checkout the [release branch](https://github.com/pmalacho-mit/mixin-suede/tree/release).

## Installation

```bash
bash <(curl https://suede.sh/install-release) --repo pmalacho-mit/mixin-suede
```

<details>
<summary>
See alternative to using <a href="https://github.com/pmalacho-mit/suede#suedesh">suede.sh</a> script proxy
</summary>

```bash
bash <(curl https://raw.githubusercontent.com/pmalacho-mit/suede/refs/heads/main/scripts/install-release.sh) --repo pmalacho-mit/mixin-suede
```

</details>

[](./environments/vite/src/USAGE.md)
<!-- p↓ BEGIN -->
<!-- p↓ length lines: 461 chars: 11470 -->
### Usage

[](?register=recipe(import)&region=include(import),remap(import,.._slash_release,mixin-suede,_),include(newline))

#### Basic Mixin (No Conflicts)

Combine classes with no overlapping properties by passing an array of class constructors:

[](environments/vite/src/usage.test.ts?apply=recipe(import)&region=include(basic))
<!-- p↓ BEGIN -->
<!-- p↓ length lines: 23 chars: 302 -->

```ts
import { mixin } from "../../mixin-suede";

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
```

<!-- p↓ END -->

#### Constructor Parameters

Each mixed class can receive its own constructor parameters. Pass them as separate tuple arrays in the same order as the classes:

[](environments/vite/src/usage.test.ts?apply=recipe(import)&region=include(constructors))
<!-- p↓ BEGIN -->
<!-- p↓ length lines: 34 chars: 582 -->

```ts
import { mixin } from "../../mixin-suede";

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
```

<!-- p↓ END -->

#### Resolving Conflicts

When classes share property names, provide a conflict resolution strategy to determine the final behavior:

##### Option 1: Inherit

Choose which class's implementation to use for the conflicting property:

[](environments/vite/src/usage.test.ts?apply=recipe(import)&region=include(simple-classes,newline,resolve-inherit))
<!-- p↓ BEGIN -->
<!-- p↓ length lines: 24 chars: 348 -->

```ts
import { mixin } from "../../mixin-suede";

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

class Mixed extends mixin([Alpha, Beta], {
  getValue: Beta, // Use Beta's implementation
}) {}

const mixed = new Mixed();
const result: "Beta" = mixed.getValue();
```

<!-- p↓ END -->

##### Option 2: Omit

Remove the conflicting property entirely from the mixed class:

[](environments/vite/src/usage.test.ts?apply=recipe(import)&region=include(simple-classes,newline,resolve-omit))
<!-- p↓ BEGIN -->
<!-- p↓ length lines: 24 chars: 328 -->

```ts
import { mixin } from "../../mixin-suede";

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

class Mixed extends mixin([Alpha, Beta], {
  getValue: null,
}) {}

const mixed = new Mixed();
const hasGetValue = "getValue" in mixed; // false
```

<!-- p↓ END -->

##### Option 3: Override

Omit the conflicting property and implement your own version. Access individual instances using `instance()` or numeric indices:

[](environments/vite/src/usage.test.ts?apply=recipe(import)&region=include(simple-classes,newline,resolve-override))
<!-- p↓ BEGIN -->
<!-- p↓ length lines: 32 chars: 663 -->

```ts
import { mixin } from "../../mixin-suede";

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
```

<!-- p↓ END -->

##### Option 4: Custom Resolver Function

Use a resolver function to merge implementations dynamically. The resolver receives arguments for each class and returns the final value. This approach allows the mixin to handle type inference automatically, unlike the override strategy where you must manually type parameters.

You can provide resolvers in two ways:
1. **Tuple syntax** (Option 4a): Pass `[Classes..., resolverFn]` directly in the conflicts map
2. **Helper function** (Options 4b-d): Pass a function that receives a  helper object (called `resolve` as a convention). Each conflicting property name is a key on this object, and its value is a function you call to create a typesafe resolver. Use the spread operator (`...`) since it returns a record with the property name as key and resolution as value.

Note: Custom resolvers have performance implications. See [Performance](../README.md#performance) for details.

###### Option 4a: Resolver Tuple

Provide classes and a resolver function as a tuple array:

[](environments/vite/src/usage.test.ts?apply=recipe(import)&region=include(complex-classes,newline,resolve-complex-tuple))
<!-- p↓ BEGIN -->
<!-- p↓ length lines: 43 chars: 915 -->

```ts
import { mixin } from "../../mixin-suede";

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
```

<!-- p↓ END -->

###### Option 4b: Resolver Helper with 2 (or more) Classes

Instead of a conflicts map, pass a function that receives a `resolve` helper. Call `resolve.example(A, C, resolverFn)` to create a typesafe resolver for the `example` property using classes A and C. The spread operator is needed because it returns `{ example: <resolution> }`:

[](environments/vite/src/usage.test.ts?apply=recipe(import)&region=include(complex-classes,newline,resolver-2-classes))
<!-- p↓ BEGIN -->
<!-- p↓ length lines: 37 chars: 814 -->

```ts
import { mixin } from "../../mixin-suede";

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
```

<!-- p↓ END -->

###### Option 4c: Resolver Helper with 1 Class

The `resolve` helper works with just one class. When you call `resolve.example(C, resolverFn)`, the resolver function receives C's arguments directly (not wrapped in a tuple), making the API more ergonomic for single-class scenarios:

[](environments/vite/src/usage.test.ts?apply=recipe(import)&region=include(complex-classes,newline,resolver-1-class))
<!-- p↓ BEGIN -->
<!-- p↓ length lines: 34 chars: 615 -->

```ts
import { mixin } from "../../mixin-suede";

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
```

<!-- p↓ END -->

###### Option 4d: Resolver Helper with No Classes

The `resolve` helper can create custom logic without inheriting any class implementations. When you call `resolve.<property>(null, resolverFn)`, the resolver receives only the `instance` accessor (and no property arguments). The resulting mixed property is a method with no parameters:

[](environments/vite/src/usage.test.ts?apply=recipe(import)&region=include(complex-classes,newline,resolver-no-class))
<!-- p↓ BEGIN -->
<!-- p↓ length lines: 34 chars: 671 -->

```ts
import { mixin } from "../../mixin-suede";

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
```

<!-- p↓ END -->

#### Accessing Individual Instances

Retrieve the underlying class instances directly using `instance(ClassName)` or their numeric index:

[](environments/vite/src/usage.test.ts?apply=recipe(import)&region=include(#access))
<!-- p↓ BEGIN -->
<!-- p↓ length lines: 31 chars: 514 -->

```ts
import { mixin } from "../../mixin-suede";

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
```

<!-- p↓ END -->

#### Property Mutability Preservation

The mixin utility maintains readonly/mutable modifiers based on your conflict resolution choice:

[](environments/vite/src/usage.test.ts?apply=recipe(import)&region=include(mutability))
<!-- p↓ BEGIN -->
<!-- p↓ length lines: 28 chars: 570 -->

```ts
import { mixin } from "../../mixin-suede";

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
```

<!-- p↓ END -->

<!-- p↓ END -->

## Features

- ✅ **Full Type Safety**: Complete TypeScript support with accurate type inference
- ✅ **Flexible Conflict Resolution**: Choose implementations, merge them, or omit properties
- ✅ **Constructor Composition**: Pass separate parameters to each mixed class
- ✅ **Property Preservation**: Maintains readonly/mutable modifiers and property descriptors
- ✅ **Instance Access**: Direct access to individual mixed instances
- ✅ **Getter/Setter Support**: Preserves getters, setters, and methods correctly

## API Reference

### `mixin(classes, conflicts?)`

Creates a new class that combines multiple classes.

**Parameters:**

- `classes`: Array of class constructors to mix together
- `conflicts` (optional): Conflict resolution map or resolver function

**Returns:** A new class constructor

**Conflict Resolution Options:**

- `null` - Omit the property
- `ClassName` - Use the implementation from the specified class
- `[...Classes, resolver]` - Custom resolver function using specified classes
- `[null, resolver]` - Custom resolver function without using any class implementations

## Performance

It's important to understand that this library trades performance for improved ergonomics. Consider the performance implications carefully and avoid using mixins in performance-critical code paths.

[](./environments/vite/src/PERFORMANCE.md)
<!-- p↓ BEGIN -->
<!-- p↓ length lines: 188 chars: 4062 -->
### Performance Benchmarks

Below is a erformance comparison of mixin-suede against standard JavaScript patterns.

All benchmarks run 1000000 iterations (after 1000 warmup iterations). Values shown are execution time in milliseconds and relative performance compared to the baseline (Standard class, or ManualComposition for instance access).

[](environments/vite/src/performance.test.ts?region=include(classes)&wrap=dropdown(See-test-classes.))
<!-- p↓ BEGIN -->
<!-- p↓ length lines: 109 chars: 1421 -->

<details>
<summary>
See test classes.
</summary>

```ts
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
```

</details>

<!-- p↓ END -->
#### Property Access (x)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| Standard | 1.50 | 1.00x slower |
| InheritX | 5.18 | 3.46x slower |
| ManualComposition | 4.49 | 3.00x slower |
| SimpleMixed | 7.79 | 5.20x slower |
| CustomMixed | 35.32 | 23.60x slower |

#### Method Calls (getValue)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| Standard | 7.83 | 1.00x slower |
| InheritX | 4.95 | 0.63x slower |
| ManualComposition | 5.47 | 0.70x slower |
| SimpleMixed | 6.97 | 0.89x slower |
| CustomMixed | 146.67 | 18.74x slower |

#### Instance Creation

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| Standard | 6.10 | 1.00x slower |
| InheritX | 69.25 | 11.35x slower |
| ManualComposition | 41.45 | 6.79x slower |
| SimpleMixed | 261.54 | 42.86x slower |
| CustomMixed | 335.28 | 54.94x slower |

#### Property Mutation (x, y)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| Standard | 4.46 | 1.00x slower |
| InheritX | 5.88 | 1.32x slower |
| ManualComposition | 6.73 | 1.51x slower |
| SimpleMixed | 43.98 | 9.87x slower |
| CustomMixed | 119.85 | 26.90x slower |

#### Property Mutation (shared)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| Standard | 4.36 | 1.00x slower |
| InheritX | 4.82 | 1.11x slower |
| ManualComposition | 5.75 | 1.32x slower |
| SimpleMixed | 39.22 | 9.00x slower |
| CustomMixed | 42.63 | 9.78x slower |

#### Instance Access (by index)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| ManualComposition | 4.44 | 1.00x slower |
| SimpleMixed | 4.40 | 0.99x slower |
| CustomMixed | 4.40 | 0.99x slower |

#### Instance Access (by instance method)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| ManualComposition | 4.44 | 1.00x slower |
| SimpleMixed | 24.54 | 5.53x slower |
| CustomMixed | 33.08 | 7.46x slower |

---

*Benchmarks generated on 2026-01-06T18:48:57.847Z*
<!-- p↓ END -->
