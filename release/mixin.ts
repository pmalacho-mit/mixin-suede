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
  Flatten,
  RemoveNeverFromRecord,
  IsReadonlyClassProperty,
  Mutable,
  NullableParameters,
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
> = Classes extends [infer constructor extends Constructor<any>]
  ? NullableParameters<constructor, Key> extends infer params extends any[]
    ? (...args: readonly [...parameters: params, instance: Instance]) => any // effectively using the signature of a single class
    : (
        ...args: readonly [parameterless: null | undefined, instance: Instance]
      ) => any
  : (
      ...args: readonly [
        ...parameters: NullableParameterTuple<Classes, Key>,
        instance: Instance
      ]
    ) => any;

type AnyResolver = ResolverFunction<any, any, any>;

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

export namespace InheritedProperty {
  type Tuple<Property, Readonly extends boolean> = [
    property: Property,
    readonly: Readonly
  ];

  export type Entry<T extends Constructor<any>, K extends PropertyKey> = Tuple<
    ClassProperty<T, K>,
    IsReadonlyClassProperty<T, K>
  >;

  type Mutability = "readonly" | "mutable";

  export type Keys<T, M extends Mutability> = {
    [K in keyof T]: T[K] extends Tuple<any, infer R>
      ? R extends (M extends "readonly" ? true : false)
        ? K
        : never
      : never;
  }[keyof T];

  export type Get<T, M extends Mutability> = Pick<
    {
      [K in keyof T]: T[K] extends Tuple<infer P, boolean> ? P : never;
    },
    Keys<T, M>
  > extends infer U
    ? M extends "readonly"
      ? Readonly<U>
      : Mutable<U>
    : never;

  export type PreserveMutability<T> = Omit<
    T,
    Keys<T, "readonly"> | Keys<T, "mutable">
  > &
    Get<T, "readonly"> &
    Get<T, "mutable">;
}

export type MergeAndResolveConflicts<
  Classes extends Constructor<any>[],
  Conflicts extends ConflictResolutionMap<Classes>
> = Expand<
  Omit<Intersect<InstanceTypes<Classes>>, keyof Conflicts> &
    InheritedProperty.PreserveMutability<
      RemoveNeverFromRecord<{
        [K in keyof Conflicts]: Conflicts[K] extends null
          ? never // Property should be omitted
          : Conflicts[K] extends Classes[number]
          ? InheritedProperty.Entry<Conflicts[K], K> // Property comes from the specified class
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
    >
>;

export type AllConstructorParameters<Classes extends Constructor<any>[]> = {
  [K in keyof Classes]: NullableIfEmptyConstructorParameters<Classes[K]>;
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

  type ConflictMap = ConflictResolutionMap<Constructor<any>[]>;
  const conflictMap: ConflictMap = conflicts ?? ({} as ConflictMap);

  const resolverConfigs: BindResolverConfig[] = [];
  const conflictChoice: Record<string, Constructor<any> | null | undefined> =
    Object.create(null);

  for (const property in conflictMap) {
    const resolution = conflictMap[property as keyof ConflictMap];

    if (resolution === null) {
      conflictChoice[property] = null;
      continue;
    }

    if (Array.isArray(resolution)) {
      const count = (resolution as []).length - 1;
      const resolve = (resolution as [])[count] as AnyResolver;
      const classesCount = count > 1 ? count : resolution[0] !== null ? 1 : 0;
      resolverConfigs.push({ property, resolve, classesCount });
      conflictChoice[property] = null;
      continue;
    }

    conflictChoice[property] = resolution as Constructor<any>;
  }

  const boundProperties = new Set<string>();

  for (const { property } of resolverConfigs) boundProperties.add(property);

  const prototypePlans: BindPrototypeConfig[] = [];

  const shouldBind = (property: string, ctor: Constructor<any>) => {
    const choice = conflictChoice[property];
    if (choice === null) return false;
    if (choice && choice !== ctor) return false;
    if (boundProperties.has(property)) return false;
    return true;
  };

  for (let classIndex = 0; classIndex < classes.length; classIndex++) {
    const Constructor = classes[classIndex];
    const prototype = Constructor.prototype;
    const propertyNames = Object.getOwnPropertyNames(prototype);

    for (let p = 0; p < propertyNames.length; p++) {
      const property = propertyNames[p];
      if (property === "constructor") continue;
      if (!shouldBind(property, Constructor)) continue;

      const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
      if (!descriptor) continue;

      const isMethod = typeof descriptor.value === "function";
      const isGetter = typeof descriptor.get === "function";
      const isSetter = typeof descriptor.set === "function";

      if (!isMethod && !isGetter && !isSetter) continue;

      boundProperties.add(property);
      prototypePlans.push({ property, classIndex, descriptor });
    }
  }

  const $instances = Symbol("instances");
  const $instanceByConstructor = Symbol("instanceMap");
  const ownKeysCache = new Array<string[] | null>(classes.length).fill(null);

  const Mixed = class {
    [$instances]!: any[];
    [$instanceByConstructor]!: Map<Constructor<any>, any>;

    instance(Constructor: Constructor<any>) {
      return this[$instanceByConstructor].get(Constructor);
    }

    constructor(...tuples: (any[] | null | undefined)[]) {
      this[$instances] = new Array(classes.length);
      this[$instanceByConstructor] = new Map<Constructor<any>, any>();

      for (let i = 0; i < classes.length; i++) {
        const Constructor = classes[i];
        const args = tuples[i] ?? [];
        const instance = new Constructor(...args);

        this[$instances][i] = instance;
        this[$instanceByConstructor].set(Constructor, instance);
        (this as any)[i] = instance;

        if (ownKeysCache[i]) continue;

        const keys = Object.getOwnPropertyNames(instance);
        ownKeysCache[i] = keys;

        for (let k = 0; k < keys.length; k++) {
          const property = keys[k];
          if (!shouldBind(property, Constructor)) continue;

          const descriptor = Object.getOwnPropertyDescriptor(
            instance,
            property
          );
          if (!descriptor) continue;

          boundProperties.add(property);
          defineOwnBinding(
            Mixed.prototype,
            property,
            i,
            descriptor,
            $instances
          );
        }
      }
    }
  };

  definePrototypeBindings(Mixed.prototype, prototypePlans, $instances);
  defineResolverBindings(
    Mixed.prototype,
    resolverConfigs,
    $instanceByConstructor
  );

  return Mixed;
}

type BindPrototypeConfig = {
  property: string;
  classIndex: number;
  descriptor: PropertyDescriptor;
};

function definePrototypeBindings(
  target: object,
  configs: BindPrototypeConfig[],
  $instances: symbol
) {
  for (let i = 0; i < configs.length; i++) {
    const { property, classIndex, descriptor } = configs[i];
    const enumerable = descriptor.enumerable ?? true;
    const configurable = descriptor.configurable ?? true;

    if (typeof descriptor.value === "function") {
      const method = descriptor.value;
      Object.defineProperty(target, property, {
        value: function (...args: any[]) {
          const instance = (this as any)[$instances][classIndex];
          return method.apply(instance, args);
        },
        writable: false,
        enumerable,
        configurable,
      });
      continue;
    }

    Object.defineProperty(target, property, {
      get: descriptor.get
        ? function (this: any) {
            const instance = this[$instances][classIndex];
            return descriptor.get!.call(instance);
          }
        : undefined,
      set: descriptor.set
        ? function (this: any, value: any) {
            const instance = this[$instances][classIndex];
            return descriptor.set!.call(instance, value);
          }
        : undefined,
      enumerable,
      configurable,
    });
  }
}

function defineOwnBinding(
  target: object,
  property: string,
  classIndex: number,
  descriptor: PropertyDescriptor,
  $instances: symbol
) {
  const enumerable = descriptor.enumerable ?? true;
  const configurable = descriptor.configurable ?? true;

  console.log("defineOwnBinding", { property, descriptor });

  Object.defineProperty(target, property, {
    get: function (this: any) {
      const instance = this[$instances][classIndex];
      return instance[property];
    },
    set: descriptor.writable
      ? function (this: any, value: any) {
          const instance = this[$instances][classIndex];
          instance[property] = value;
        }
      : undefined,
    enumerable,
    configurable,
  });
}

type BindResolverConfig = {
  property: string;
  resolve: AnyResolver;
  classesCount: number;
};

function defineResolverBindings(
  target: object,
  configs: BindResolverConfig[],
  $instanceByConstructor: symbol
) {
  for (let i = 0; i < configs.length; i++) {
    const { property, resolve, classesCount } = configs[i];

    Object.defineProperty(target, property, {
      value: function (this: any, ...args: any[]) {
        const getInstance = (ctor: Constructor<any>) =>
          this[$instanceByConstructor].get(ctor);

        //if (isSingle) return resolve(...args, getInstance);

        while (args.length < classesCount) args.push(null);
        return resolve(...args, getInstance);
      },
      writable: false,
      enumerable: true,
      configurable: false,
    });
  }
}
