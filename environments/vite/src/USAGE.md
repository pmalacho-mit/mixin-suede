# Usage

[](?register=recipe(import)&region=include(import),remap(import,.._slash_release,mixin-suede,_),include(newline))

## Basic Mixin (No Conflicts)

Combine classes with no overlapping properties by passing an array of class constructors:

[](./usage.test.ts?apply=recipe(import)&region=include(basic))

## Constructor Parameters

Each mixed class can receive its own constructor parameters. Pass them as separate tuple arrays in the same order as the classes:

[](./usage.test.ts?apply=recipe(import)&region=include(constructors))

## Resolving Conflicts

When classes share property names, provide a conflict resolution strategy to determine the final behavior:

### Option 1: Inherit

Choose which class's implementation to use for the conflicting property:

[](./usage.test.ts?apply=recipe(import)&region=include(simple-classes,newline,resolve-inherit))

### Option 2: Omit

Remove the conflicting property entirely from the mixed class:

[](./usage.test.ts?apply=recipe(import)&region=include(simple-classes,newline,resolve-omit))

### Option 3: Override

Omit the conflicting property and implement your own version. Access individual instances using `instance()` or numeric indices:

[](./usage.test.ts?apply=recipe(import)&region=include(simple-classes,newline,resolve-override))

### Option 4: Custom Resolver Function

Use a resolver function to merge implementations dynamically. The resolver receives arguments for each class and returns the final value. This approach allows the mixin to handle type inference automatically, unlike the override strategy where you must manually type parameters.

You can provide resolvers in two ways:
1. **Tuple syntax** (Option 4a): Pass `[Classes..., resolverFn]` directly in the conflicts map
2. **Helper function** (Options 4b-d): Pass a function that receives a  helper object (called `resolve` as a convention). Each conflicting property name is a key on this object, and its value is a function you call to create a typesafe resolver. Use the spread operator (`...`) since it returns a record with the property name as key and resolution as value.

Note: Custom resolvers have performance implications. See [Performance](../README.md#performance) for details.

#### Option 4a: Resolver Tuple

Provide classes and a resolver function as a tuple array:

[](./usage.test.ts?apply=recipe(import)&region=include(complex-classes,newline,resolve-complex-tuple))

#### Option 4b: Resolver Helper with 2 (or more) Classes

Instead of a conflicts map, pass a function that receives a `resolve` helper. Call `resolve.example(A, C, resolverFn)` to create a typesafe resolver for the `example` property using classes A and C. The spread operator is needed because it returns `{ example: <resolution> }`:

[](./usage.test.ts?apply=recipe(import)&region=include(complex-classes,newline,resolver-2-classes))

#### Option 4c: Resolver Helper with 1 Class

The `resolve` helper works with just one class. When you call `resolve.example(C, resolverFn)`, the resolver function receives C's arguments directly (not wrapped in a tuple), making the API more ergonomic for single-class scenarios:

[](./usage.test.ts?apply=recipe(import)&region=include(complex-classes,newline,resolver-1-class))

#### Option 4d: Resolver Helper with No Classes

The `resolve` helper can create custom logic without inheriting any class implementations. When you call `resolve.<property>(null, resolverFn)`, the resolver receives only the `instance` accessor (and no property arguments). The resulting mixed property is a method with no parameters:

[](./usage.test.ts?apply=recipe(import)&region=include(complex-classes,newline,resolver-no-class))

## Accessing Individual Instances

Retrieve the underlying class instances directly using `instance(ClassName)` or their numeric index:

[](./usage.test.ts?apply=recipe(import)&region=include(#access))

## Property Mutability Preservation

The mixin utility maintains readonly/mutable modifiers based on your conflict resolution choice:

[](./usage.test.ts?apply=recipe(import)&region=include(mutability))
