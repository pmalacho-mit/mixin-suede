export type Constructor<T = {}> = new (...args: any[]) => T;

export type InstanceFromConstructor<T> = T extends Constructor<infer U>
  ? U
  : never;

export type InstanceTypes<T extends Constructor<any>[]> = {
  [K in keyof T]: InstanceFromConstructor<T[K]>;
};

export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type Intersect<T extends any[]> = UnionToIntersection<T[number]>;

export type DetectOverlap<Source, Others extends any[]> = Others extends [
  infer Head,
  ...infer Tail
]
  ? Head extends object
    ? (keyof Source & keyof Head) | DetectOverlap<Source, Tail>
    : DetectOverlap<Source, Tail>
  : never;

export type OverlappingKeys<T extends any[]> = T extends [
  infer Head,
  ...infer Tail
]
  ? Head extends object
    ? Tail extends any[]
      ? DetectOverlap<Head, Tail> | OverlappingKeys<Tail>
      : never
    : never
  : never;

export type ClassProperty<
  T extends Constructor<any>,
  K extends PropertyKey
> = T extends Constructor<infer U> ? U[K & keyof U] : never;

export type ClassHasProperty<
  T,
  K extends PropertyKey,
  If = true,
  Else = false
> = T extends Constructor<infer U> ? (K extends keyof U ? If : Else) : Else;

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type NullableIfEmptyConstructorParameters<T extends Constructor<any>> =
  ConstructorParameters<T> extends []
    ? null | undefined | []
    : ConstructorParameters<T>;

export type SubTuples<T extends readonly unknown[]> = T extends readonly [
  infer Head,
  ...infer Tail
]
  ? [Head] | [Head, ...SubTuples<Tail>] | SubTuples<Tail>
  : never;
