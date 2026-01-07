# Performance Benchmarks

Below is a erformance comparison of mixin-suede against standard JavaScript patterns.

All benchmarks run 1000000 iterations (after 1000 warmup iterations). Values shown are execution time in milliseconds and relative performance compared to the baseline (Standard class, or ManualComposition for instance access).

[](./performance.test.ts?region=include(classes)&wrap=dropdown(See-test-classes.))
## Property Access (x)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| Standard | 1.50 | 1.00x slower |
| InheritX | 5.18 | 3.46x slower |
| ManualComposition | 4.49 | 3.00x slower |
| SimpleMixed | 7.79 | 5.20x slower |
| CustomMixed | 35.32 | 23.60x slower |

## Method Calls (getValue)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| Standard | 7.83 | 1.00x slower |
| InheritX | 4.95 | 0.63x slower |
| ManualComposition | 5.47 | 0.70x slower |
| SimpleMixed | 6.97 | 0.89x slower |
| CustomMixed | 146.67 | 18.74x slower |

## Instance Creation

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| Standard | 6.10 | 1.00x slower |
| InheritX | 69.25 | 11.35x slower |
| ManualComposition | 41.45 | 6.79x slower |
| SimpleMixed | 261.54 | 42.86x slower |
| CustomMixed | 335.28 | 54.94x slower |

## Property Mutation (x, y)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| Standard | 4.46 | 1.00x slower |
| InheritX | 5.88 | 1.32x slower |
| ManualComposition | 6.73 | 1.51x slower |
| SimpleMixed | 43.98 | 9.87x slower |
| CustomMixed | 119.85 | 26.90x slower |

## Property Mutation (shared)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| Standard | 4.36 | 1.00x slower |
| InheritX | 4.82 | 1.11x slower |
| ManualComposition | 5.75 | 1.32x slower |
| SimpleMixed | 39.22 | 9.00x slower |
| CustomMixed | 42.63 | 9.78x slower |

## Instance Access (by index)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| ManualComposition | 4.44 | 1.00x slower |
| SimpleMixed | 4.40 | 0.99x slower |
| CustomMixed | 4.40 | 0.99x slower |

## Instance Access (by instance method)

| Class | Time (ms) | Relative Performance |
|-------|-----------|---------------------|
| ManualComposition | 4.44 | 1.00x slower |
| SimpleMixed | 24.54 | 5.53x slower |
| CustomMixed | 33.08 | 7.46x slower |

---

*Benchmarks generated on 2026-01-06T18:48:57.847Z*