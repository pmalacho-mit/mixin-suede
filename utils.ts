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

type IfEquals<X, Y, A = X, B = never> = (<T>() => T extends X ? 1 : 2) extends <
  T
>() => T extends Y ? 1 : 2
  ? A
  : B;

// https://github.com/type-challenges/type-challenges/issues/25081
export type ReadonlyKeys<T extends object> = {
  [P in keyof T]-?: IfEquals<
    { [Q in P]: T[P] },
    { -readonly [Q in P]: T[P] },
    never,
    P
  >;
}[keyof T];

export type NonReadonlyKeys<T extends object> = {
  [k in keyof T]: k extends ReadonlyKeys<T> ? never : k;
}[keyof T];

export type ClassHasProperty<
  T,
  K extends PropertyKey,
  If = true,
  Else = false
> = T extends Constructor<infer U> ? (K extends keyof U ? If : Else) : Else;

export type IsReadonlyClassProperty<
  T,
  K extends PropertyKey,
  If = true,
  Else = false
> = T extends Constructor<infer U extends object>
  ? ClassHasProperty<T, K> extends true
    ? K extends ReadonlyKeys<U>
      ? If
      : Else
    : Else
  : Else;

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type NullableIfEmptyConstructorParameters<T extends Constructor<any>> =
  ConstructorParameters<T> extends []
    ? null | undefined
    : ConstructorParameters<T>;

export type SubTuples<T extends readonly any[]> = T extends readonly [
  infer Head,
  ...infer Tail
]
  ? [Head] | [Head, ...SubTuples<Tail>] | SubTuples<Tail>
  : never;

export type SubTuplesWithEmpty<T extends readonly any[]> = SubTuples<T> | [];

export type RemoveNever<T extends readonly unknown[]> = T extends [
  infer Head,
  ...infer Tail
]
  ? [Head] extends [never]
    ? RemoveNever<Tail>
    : [Head, ...RemoveNever<Tail>]
  : [];

export type Last<T extends any[]> = T extends [...infer _, infer Tail]
  ? Tail
  : never;

export type Pop<T extends any[]> = T extends [...infer Rest, any]
  ? Rest
  : never;

export type Flatten<T extends any[]> = T extends [infer Head, ...infer Tail]
  ? Head extends any[]
    ? [...Head, ...Flatten<Tail>]
    : [Head, ...Flatten<Tail>]
  : [];

export type TrimTrailingNullable<T extends any[]> = T extends [
  ...infer Rest,
  infer Last
]
  ? Last extends null | undefined
    ? TrimTrailingNullable<Rest>
    : T
  : T;

export type TrimmedTrailingNullableVariants<T extends any[]> = T extends [
  ...infer Rest,
  infer Last
]
  ? Last extends null | undefined
    ? TrimmedTrailingNullableVariants<Rest> | T
    : T
  : T;

export type TryGetMethodParameters<
  T extends Constructor<any>,
  K extends PropertyKey
> = T extends Constructor<infer U>
  ? K extends keyof U
    ? U[K] extends (...args: infer Args) => any
      ? Args
      : []
    : []
  : [];

export type NullableParameters<
  Class extends Constructor<any>,
  K extends PropertyKey
> = TryGetMethodParameters<Class, K> extends []
  ? null | undefined
  : TryGetMethodParameters<Class, K>;

export type NullableParameterTuple<
  Classes extends Constructor<any>[],
  K extends PropertyKey
> = {
  [i in keyof Classes]: NullableParameters<Classes[i], K>;
};

export type RemoveNeverFromRecord<R extends Record<string, any>> = {
  [K in keyof R as R[K] extends never ? never : K]: R[K];
};

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};
