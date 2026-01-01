import type {
  Constructor,
  InstanceTypes,
  Intersect,
  OverlappingKeys,
  ClassProperty,
  ClassHasProperty,
  Expand,
  NullableIfEmptyConstructorParameters,
  NullableParameterTuple,
  SubTuplesWithEmpty,
  InstanceFromConstructor,
  RemoveNever,
  Pop,
  TrimTrailingNullable,
  //TrimmedTrailingNullableVariants,
  Flatten,
  RemoveNeverFromRecord,
} from "./utils";
import type { mixin } from "./";

export type ClassesContainingKey<
  Classes extends Constructor<any>[],
  Key extends PropertyKey
> = RemoveNever<{
  [k in keyof Classes]: ClassHasProperty<Classes[k], Key, Classes[k], never>;
}>;

export type ClassContainingKey<
  Classes extends Constructor<any>[],
  Key extends PropertyKey
> = ClassesContainingKey<Classes, Key>[number];

export type GetInstance<Classes extends Constructor<any>[]> = <
  T extends Classes[number]
>(
  cls: T
) => InstanceFromConstructor<T>;

export type ResolverFunction<
  Classes extends Constructor<any>[],
  Key extends PropertyKey,
  Instance extends GetInstance<Classes>
> = (
  ...args: readonly [
    ...parameters: NullableParameterTuple<Classes, Key>,
    instance: Instance
  ]
) => any;

export type ResolverTuple<
  Classes extends Constructor<any>[],
  Key extends PropertyKey,
  Instance extends GetInstance<Classes>
> = readonly [
  ...classes: Classes,
  resolver: ResolverFunction<Classes, Key, Instance>
];

export type ResolveConflict<
  AllClasses extends Constructor<any>[],
  Key extends OverlappingKeys<InstanceTypes<AllClasses>>
> = ClassesContainingKey<
  AllClasses,
  Key
> extends infer MatchingClasses extends Constructor<any>[]
  ?
      | MatchingClasses[number] // Use one of the classes directly
      | (SubTuplesWithEmpty<MatchingClasses> extends infer T
          ? T extends Constructor<any>[]
            ? ResolverTuple<T, Key, GetInstance<AllClasses>>
            : never
          : never) // Use a resolver function with a subset of the classes
      | null // Indicate to omit this property
  : never;

export type ConflictResolutionMap<Classes extends Constructor<any>[]> = {
  [K in OverlappingKeys<InstanceTypes<Classes>>]: ResolveConflict<Classes, K>;
};

export type MergeAndResolveConflicts<
  Classes extends Constructor<any>[],
  Conflicts extends ConflictResolutionMap<Classes>
> = Expand<
  Omit<Intersect<InstanceTypes<Classes>>, keyof Conflicts> &
    RemoveNeverFromRecord<{
      [K in keyof Conflicts]: Conflicts[K] extends null
        ? never // Property should be omitted
        : Conflicts[K] extends Classes[number]
        ? ClassProperty<Conflicts[K], K> // Property comes from the specified class
        : Conflicts[K] extends readonly [
            Classes[number],
            (...args: infer Args) => infer Return
          ]
        ? (...args: TrimTrailingNullable<Flatten<Pop<Args>>>) => Return // Property is a method defined by the resolver with the same arguments as the class property
        : Conflicts[K] extends readonly [
            ...Classes[number][],
            (...args: infer Args) => infer Return
          ]
        ? (...args: TrimTrailingNullable<Pop<Args>>) => Return // Property is a method defined by the resolver
        : never;
    }>
>;

export type AllConstructorParameters<Classes extends Constructor<any>[]> = {
  [K in keyof Classes]: NullableIfEmptyConstructorParameters<Classes[K]>;
};

const wrap = <Source>(
  sink: any,
  source: Source,
  key: keyof Source,
  description?: PropertyDescriptor,
  bindIfFunction: boolean = false
) => {
  // For simple writable properties, use direct getter/setter for better performance
  if (!bindIfFunction && description?.writable) {
    Object.defineProperty(sink, key, {
      get: () => source[key],
      set: (value) => {
        source[key] = value;
      },
      enumerable: description?.enumerable ?? true,
      configurable: description?.configurable ?? true,
    });
  } else {
    Object.defineProperty(sink, key, {
      get: () =>
        bindIfFunction && typeof source[key] === "function"
          ? source[key].bind(source)
          : source[key],
      set: description?.writable
        ? (value) => {
            source[key] = value;
          }
        : undefined,
      enumerable: description?.enumerable ?? true,
      configurable: description?.configurable ?? true,
    });
  }
};

export const resolverProxy = <const T extends Constructor<any>[]>(
  classes: T
): mixin.Resolver<T> =>
  new Proxy(
    {},
    {
      get:
        (_, key: string) =>
        (...args: any[]) => {
          if (args.length === 0) throw new Error("No arguments provided");
          if (args.length > 1) return { [key]: args }; // Custom resolver function
          return { [key]: args[0] }; // Omit property or take from specific class
        },
    }
  );

export type InstanceMethods<Classes extends Constructor<any>[]> = Omit<
  {
    [k in keyof Classes]: InstanceFromConstructor<Classes[k]>;
  },
  keyof []
> & {
  instance: GetInstance<Classes>;
};

/**
 * Create a new class that mixes in multiple classes.
 * @param classes The classes to mix in.
 * @overload No conflicts: simply provide the classes to mix in
 */
export default function <const Classes extends Constructor<any>[]>(
  classes: OverlappingKeys<InstanceTypes<Classes>> extends never
    ? Classes
    : never
): new (
  ...args: TrimTrailingNullable<AllConstructorParameters<Classes>>
) => Intersect<InstanceTypes<Classes>> & InstanceMethods<Classes>;

/**
 * Create a new class that mixes in multiple classes.
 * @param classes The classes to mix in, followed by a conflict map to resolve property conflicts.
 * @param conflicts The conflict resolution map.
 * @overload With conflicts: provide the classes to mix in, followed by a conflict (resolution) map
 */
export default function <
  const Classes extends Constructor<any>[],
  const Conflicts extends ConflictResolutionMap<Classes>
>(
  classes: Classes,
  conflicts: Conflicts
): new (
  ...args: TrimTrailingNullable<AllConstructorParameters<Classes>>
) => MergeAndResolveConflicts<Classes, Conflicts> & InstanceMethods<Classes>;

/**
 * Create a new class that mixes in multiple classes.
 * @param classes The classes to mix in, followed by a resolver function to resolve property conflicts.
 * @param resolve The resolver function.
 * @overload With conflicts: provide the classes to mix in, followed by a resolver function
 */
export default function <
  const Classes extends Constructor<any>[],
  const ResolveConflicts extends (
    resolve: mixin.Resolver<Classes>
  ) => ConflictResolutionMap<Classes>
>(
  classes: Classes,
  resolve: ResolveConflicts
): new (
  ...args: TrimTrailingNullable<AllConstructorParameters<Classes>>
) => MergeAndResolveConflicts<Classes, ReturnType<ResolveConflicts>> &
  InstanceMethods<Classes>;

// Runtime implementation
export default function (
  classes: Constructor<any>[],
  conflictMapOrResolver?:
    | ConflictResolutionMap<Constructor<any>[]>
    | ((
        resolve: mixin.Resolver<Constructor<any>[]>
      ) => ConflictResolutionMap<Constructor<any>[]>)
): any {
  const conflicts: ConflictResolutionMap<Constructor<any>[]> | undefined =
    typeof conflictMapOrResolver === "function"
      ? conflictMapOrResolver(resolverProxy(classes))
      : conflictMapOrResolver;

  return class {
    readonly #instances: Map<Constructor<any>, any>;

    instance(Constructor: Constructor<any>) {
      return this.#instances.get(Constructor);
    }

    constructor(...tuples: (any[] | null | undefined)[]) {
      this.#instances = new Map();

      for (let i = 0; i < classes.length; i++) {
        const Constructor = classes[i];
        const instance = new Constructor(...(tuples[i] ?? []));
        (this as any)[i] = instance;
        this.#instances.set(Constructor, instance);
        const prototype = Object.getPrototypeOf(instance);

        for (const property of Object.getOwnPropertyNames(instance)) {
          if (conflicts && property in conflicts) {
            if (conflicts[property as keyof typeof conflicts] !== Constructor)
              continue;
          } else if (Object.prototype.hasOwnProperty.call(this, property))
            continue;

          const description = Object.getOwnPropertyDescriptor(
            instance,
            property
          );

          Object.defineProperty(this, property, {
            get: () => instance[property],
            set: description?.writable
              ? (value) => (void 0, (instance[property] = value))
              : undefined,
            enumerable: description?.enumerable ?? true,
            configurable: description?.configurable ?? true,
          });
        }

        for (const property of Object.getOwnPropertyNames(prototype)) {
          if (property === "constructor") continue;
          const descriptor = Object.getOwnPropertyDescriptor(
            prototype,
            property
          );

          if (!descriptor) continue;

          const isMethod = typeof descriptor.value === "function";
          const isGetter = typeof descriptor.get === "function";
          const isSetter = typeof descriptor.set === "function";

          if (!isMethod && !isGetter && !isSetter) continue;

          if (conflicts && property in conflicts) {
            if (conflicts[property as keyof typeof conflicts] !== Constructor)
              continue;
          } else if (Object.prototype.hasOwnProperty.call(this, property))
            continue;

          if (isMethod)
            Object.defineProperty(this, property, {
              value: descriptor.value.bind(instance),
              writable: false,
              enumerable: descriptor.enumerable ?? true,
              configurable: descriptor.configurable ?? true,
            });
          else
            Object.defineProperty(this, property, {
              get: descriptor.get?.bind(instance),
              set: descriptor.set?.bind(instance),
              enumerable: descriptor.enumerable ?? true,
              configurable: descriptor.configurable ?? true,
            });
        }
      }

      const getInstance = this.instance.bind(this);

      for (const property in conflicts) {
        const resolution = conflicts[property as keyof typeof conflicts];
        if (resolution === null || !Array.isArray(resolution)) continue;

        type AnyResolver = ResolverFunction<any, any, any>;

        const classesCount = (resolution as []).length - 1;
        const resolve = (resolution as [])[classesCount] as AnyResolver;

        const isSingleClassResolution =
          (resolution as unknown[]).length === 1 && resolution[0] !== null;

        if (isSingleClassResolution) {
          Object.defineProperty(this, property, {
            value: (...args: any[]) => resolve(args, getInstance),
            writable: false,
            enumerable: true,
            configurable: false,
          });
        } else {
          Object.defineProperty(this, property, {
            value: (...args: any[]) => {
              while (args.length < classesCount) args.push(null);
              return resolve(...args, getInstance);
            },
            writable: false,
            enumerable: true,
            configurable: false,
          });
        }
      }
    }
  };
}
