import type {
  Constructor,
  InstanceTypes,
  Intersect,
  OverlappingKeys,
  ClassProperty,
  ClassHasProperty,
  Expand,
  NullableIfEmptyConstructorParameters,
} from "./utils";

export type ClassListContainingKey<
  Classes extends Constructor<any>[],
  Key extends PropertyKey
> = {
  [k in keyof Classes]: ClassHasProperty<Classes[k], Key, Classes[k], never>;
};

export type ClassesContainingKey<
  Classes extends Constructor<any>[],
  Key extends PropertyKey
> = ClassListContainingKey<Classes, Key>[number];

export type ResolverFunction<
  ClassList extends Constructor<any>[],
  Key extends PropertyKey,
  ReturnType = any
> = (
  ...args: [
    ...parameters: ParameterTuple<ClassList, Key>,
    instances: InstanceMap<ClassList>
  ]
) => ReturnType;

export type ResolverTuple<
  ClassList extends Constructor<any>[],
  Key extends PropertyKey
> = [...classes: ClassList, resolver: ResolverFunction<ClassList, Key>];

export type ResolveConflict<
  Classes extends Constructor<any>[],
  Key extends OverlappingKeys<InstanceTypes<Classes>>
> = Classes[number]; /** TODO */

export type ConflictMap<Classes extends Constructor<any>[]> = {
  [K in OverlappingKeys<InstanceTypes<Classes>>]: ResolveConflict<
    ClassListContainingKey<Classes, K>,
    K
  >;
};

export type MergeAndResolveConflicts<
  Classes extends Constructor<any>[],
  Conflicts extends ConflictMap<Classes>
> = Expand<
  Omit<Intersect<InstanceTypes<Classes>>, keyof Conflicts> & {
    [K in keyof Conflicts]: ClassProperty<Conflicts[K], K>;
  }
>;

export type AllConstructorParameters<Classes extends Constructor<any>[]> = {
  [K in keyof Classes]: NullableIfEmptyConstructorParameters<Classes[K]>;
};

const wrap = <Source>(
  sink: any,
  source: Source,
  key: keyof Source,
  description?: PropertyDescriptor
) =>
  Object.defineProperty(sink, key, {
    get: () => source[key],
    set: description?.writable
      ? (value) => {
          source[key] = value;
        }
      : undefined,
    enumerable: description?.enumerable ?? true,
    configurable: description?.configurable ?? true,
  });

/**
 * Create a new class that mixes in multiple classes.
 * @param classes The classes to mix in.
 * @overload No conflicts: simply provide the classes to mix in
 */
export default function <Classes extends Constructor<any>[]>(
  ...classes: OverlappingKeys<InstanceTypes<Classes>> extends never
    ? Classes
    : never
): new (...args: AllConstructorParameters<Classes>) => Intersect<
  InstanceTypes<Classes>
>;

/**
 * Create a new class that mixes in multiple classes.
 * @param classesThenConflictMap The classes to mix in, followed by a conflict map to resolve property conflicts.
 * @overload With conflicts: provide the classes to mix in, followed by a conflict map
 */
export default function <
  Classes extends Constructor<any>[],
  Conflicts extends ConflictMap<Classes>
>(
  ...classesThenConflictMap: [...classes: Classes, conflicts: Conflicts]
): new (...args: AllConstructorParameters<Classes>) => MergeAndResolveConflicts<
  Classes,
  Conflicts
>;

// Runtime implementation
export default function (
  ...args: [
    ...classes: Constructor<any>[],
    conflicts: Constructor<any> | ConflictMap<Constructor<any>[]>
  ]
): any {
  const classes = args as Constructor<any>[];
  const conflicts =
    typeof args[args.length - 1] === "function"
      ? undefined
      : (args.pop() as ConflictMap<Constructor<any>[]>);

  return class {
    constructor(...tuples: (any[] | null | undefined)[]) {
      if (tuples.length !== classes.length)
        throw new Error(
          `Expected ${classes.length} argument tuples, but got ${tuples.length}`
        );

      const instances: any[] = [];

      for (let i = 0; i < classes.length; i++) {
        const Constructor = classes[i];
        const instance = new Constructor(...(tuples[i] ?? []));
        instances.push(instance);
        const prototype = Object.getPrototypeOf(instance);

        for (const property of Object.getOwnPropertyNames(instance)) {
          if (conflicts && property in conflicts) {
            if (conflicts[property as keyof typeof conflicts] !== Constructor)
              continue;
          } else if (Object.prototype.hasOwnProperty.call(this, property))
            continue;
          wrap(
            this,
            instance,
            property,
            Object.getOwnPropertyDescriptor(instance, property)!
          );
        }

        for (const property of Object.getOwnPropertyNames(prototype)) {
          if (property === "constructor") continue;
          const descriptor = Object.getOwnPropertyDescriptor(
            prototype,
            property
          );
          if (
            !descriptor ||
            !descriptor.value ||
            typeof descriptor.value !== "function"
          )
            continue;

          if (conflicts && property in conflicts) {
            if (conflicts[property as keyof typeof conflicts] !== Constructor)
              continue;
          } else if (Object.prototype.hasOwnProperty.call(this, property))
            continue;

          wrap(this, instance, property, {
            ...descriptor,
            get() {
              return descriptor.value.bind(instance);
            },
          });
        }
      }
    }
  };
}
