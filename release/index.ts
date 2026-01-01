import type {
  GetInstance,
  ClassesContainingKey,
  ResolverFunction,
} from "./mixin";
import type {
  Constructor,
  OverlappingKeys,
  InstanceTypes,
  SubTuplesWithEmpty,
} from "./utils";

import _mixin, { resolverProxy } from "./mixin";

export namespace mixin {
  export interface Resolve<
    T extends Constructor<any>[],
    Key extends OverlappingKeys<InstanceTypes<T>>
  > {
    /**
     * Omit the conflicting property within the mixed class.
     */
    (arg: null): Record<Key, null>;

    /**
     * Take the implementation of the conflicting property from a specific class.
     */
    <Class extends ClassesContainingKey<T, Key>[number]>(arg: Class): Record<
      Key,
      Class
    >;

    /**
     * Provide a custom resolver function to resolve the conflict
     * using a subset of the classes that contain the conflicting property.
     */
    <
      Classes extends Constructor<any>[] &
        SubTuplesWithEmpty<ClassesContainingKey<T, Key>>,
      const Resolve extends ResolverFunction<Classes, Key, GetInstance<T>>
    >(
      ...args: [...Classes, resolver: Resolve]
    ): Record<Key, [...Classes, Resolve]>;

    /**
     * Provide a custom resolver function to resolve the conflict.
     * This variant does not use any of the classes containing the conflicting property.
     *
     * NOTE: It is necessary to include `null` as the first argument to disambiguate this overload
     * (as class constructors with no static properties look simply like functions, which conflicts with the above overload).
     */
    <Resolve extends ResolverFunction<[], Key, GetInstance<T>>>(
      ...args: [classes: null, resolver: Resolve]
    ): Record<Key, [Resolve]>;
  }

  export type Resolver<T extends Constructor<any>[]> = {
    [k in OverlappingKeys<InstanceTypes<T>>]: Resolve<T, k>;
  };
}

export const mixin = Object.assign(_mixin, {
  resolver: <const T extends Constructor<any>[]>(classes: T) =>
    resolverProxy(classes),
});
