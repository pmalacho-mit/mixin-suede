# Performance Benchmarks

Below is a erformance comparison of mixin-suede against standard JavaScript patterns.

All benchmarks run 1000000 iterations (after 1000 warmup iterations). Values shown are execution time in milliseconds and relative performance compared to the baseline (Standard class, or ManualComposition for instance access).

[](./performance.test.ts?region=include(classes)&wrap=dropdown(See-test-classes.))
## Property Access (x)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| Standard | 1.64 | 1.00x slower |
| InheritX | 5.71 | 3.48x slower |
| ManualComposition | 4.68 | 2.85x slower |
| SimpleMixed | 8.17 | 4.97x slower |
| CustomMixed | 36.90 | 22.47x slower |
| ProxyMixed | 21.83 | 13.29x slower |

## Method Calls (getValue)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| Standard | 6.21 | 1.00x slower |
| InheritX | 5.04 | 0.81x slower |
| ManualComposition | 5.77 | 0.93x slower |
| SimpleMixed | 6.97 | 1.12x slower |
| CustomMixed | 151.12 | 24.34x slower |
| ProxyMixed | 74.78 | 12.04x slower |

## Instance Creation

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| Standard | 6.12 | 1.00x slower |
| InheritX | 72.04 | 11.77x slower |
| ManualComposition | 43.52 | 7.11x slower |
| SimpleMixed | 271.71 | 44.40x slower |
| CustomMixed | 342.81 | 56.02x slower |
| ProxyMixed | 63.03 | 10.30x slower |

## Property Mutation (x, y)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| Standard | 4.44 | 1.00x slower |
| InheritX | 6.27 | 1.41x slower |
| ManualComposition | 6.96 | 1.57x slower |
| SimpleMixed | 43.89 | 9.88x slower |
| CustomMixed | 122.65 | 27.62x slower |
| ProxyMixed | 123.01 | 27.70x slower |

## Property Mutation (shared)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| Standard | 4.48 | 1.00x slower |
| InheritX | 4.89 | 1.09x slower |
| ManualComposition | 5.57 | 1.24x slower |
| SimpleMixed | 39.34 | 8.79x slower |
| CustomMixed | 44.17 | 9.87x slower |
| ProxyMixed | 51.34 | 11.47x slower |

## Instance Access (by index)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| ManualComposition | 4.58 | 1.00x slower |
| SimpleMixed | 4.56 | 0.99x slower |
| CustomMixed | 4.63 | 1.01x slower |

## Instance Access (by instance method)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| ManualComposition | 4.58 | 1.00x slower |
| SimpleMixed | 22.97 | 5.01x slower |
| CustomMixed | 32.99 | 7.20x slower |

---

*Benchmarks generated on 2026-01-09T21:17:56.838Z*