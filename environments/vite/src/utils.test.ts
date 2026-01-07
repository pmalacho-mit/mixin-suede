import { describe, test, expect, expectTypeOf } from "vitest";
import {
  type Constructor,
  type InstanceFromConstructor,
  type InstanceTypes,
  type Intersect,
  type UnionToIntersection,
  type DetectOverlap,
  type OverlappingKeys,
  type ClassProperty,
  type ClassHasProperty,
  type SubTuples,
  type NullableParameterTuple,
  type ReadonlyKeys,
  type NonReadonlyKeys,
  type IsReadonlyClassProperty,
} from "../../../release/utils";

type UtilityTypes = {
  Constructor: Constructor;
  InstanceFromConstructor: InstanceFromConstructor<any>;
  InstanceTypes: InstanceTypes<Constructor[]>;
  UnionToIntersection: UnionToIntersection<any>;
  Intersect: Intersect<any[]>;
  DetectOverlap: DetectOverlap<any, any[]>;
  OverlappingKeys: OverlappingKeys<any[]>;
  ClassProperty: ClassProperty<Constructor, string>;
  ClassHasProperty: ClassHasProperty<any, string>;
  SubTuples: SubTuples<readonly unknown[]>;
  NullableParameterTuple: NullableParameterTuple<Constructor[], string>;
  ReadonlyKeys: ReadonlyKeys<any>;
  NonReadonlyKeys: NonReadonlyKeys<any>;
  IsReadonlyClassProperty: IsReadonlyClassProperty<any, string>;
};

const name = (...args: (keyof UtilityTypes)[]) => args.join(", ");

describe("Utility Types", () => {
  describe("Constructor" satisfies keyof UtilityTypes, () => {
    test("should be compatible with typeof (meaning `extends`) even if not equal", () => {
      class Person {
        name = "John";
        age = 30;
      }

      expectTypeOf<
        typeof Person extends Constructor<Person> ? true : false
      >().toEqualTypeOf<true>();
      expectTypeOf<
        Constructor<Person> extends typeof Person ? true : false
      >().toEqualTypeOf<true>();

      expectTypeOf<Constructor<string>>().not.toEqualTypeOf<typeof Person>();
      expectTypeOf<typeof Person>().not.toEqualTypeOf<Constructor<number>>();
    });
  });

  describe("InstanceFromConstructor" satisfies keyof UtilityTypes, () => {
    test("should extract instance type from constructor", () => {
      class Person {
        name = "John";
        age = 30;
      }

      expectTypeOf<InstanceFromConstructor<typeof Person>>().toEqualTypeOf<{
        name: string;
        age: number;
      }>();
    });

    test("should return never for non-constructor types", () => {
      type NotConstructor = InstanceFromConstructor<string>;
      expectTypeOf<NotConstructor>().toEqualTypeOf<never>();
    });
  });

  describe("InstanceTypes" satisfies keyof UtilityTypes, () => {
    test("should extract instance types from tuple of constructors", () => {
      class A {
        a = 1;
      }
      class B {
        b = "hello";
      }
      class C {
        c = true;
      }

      expectTypeOf<
        InstanceTypes<[typeof A, typeof B, typeof C]>
      >().toEqualTypeOf<[{ a: number }, { b: string }, { c: boolean }]>();
    });
  });

  describe("UnionToIntersection" satisfies keyof UtilityTypes, () => {
    test("should convert union to intersection", () => {
      type Union = { a: number } | { b: string };

      expectTypeOf<UnionToIntersection<Union>>().toEqualTypeOf<
        { a: number } & { b: string }
      >();
    });

    test("should handle multiple union members", () => {
      type Union = { x: number } | { y: string } | { z: boolean };

      expectTypeOf<UnionToIntersection<Union>>().toEqualTypeOf<
        { x: number } & { y: string } & { z: boolean }
      >();
    });
  });

  describe("Intersect" satisfies keyof UtilityTypes, () => {
    test("should create intersection from tuple of types", () => {
      type Types = [{ a: number }, { b: string }, { c: boolean }];

      expectTypeOf<Intersect<Types>>().toEqualTypeOf<
        { a: number } & { b: string } & { c: boolean }
      >();
    });

    test("should handle overlapping properties with compatible types", () => {
      type Types = [{ x: number; y: string }, { y: string; z: boolean }];

      expectTypeOf<Intersect<Types>>().toEqualTypeOf<Types[0] & Types[1]>();
    });

    test("should result in never for incompatible overlapping properties", () => {
      type Types = [{ a: number }, { a: boolean }];

      expectTypeOf<Intersect<Types>>().toEqualTypeOf<never>();
    });

    test("NOTE: Unexpected behavior with string/number overlapping properties", () => {
      type Types = [{ a: string }, { a: number }];

      expectTypeOf<Intersect<Types>>().toEqualTypeOf<Types[0] & Types[1]>();
      expectTypeOf<Intersect<Types>>().not.toEqualTypeOf<never>();
      expectTypeOf<(Types[0] & Types[1])["a"]>().toEqualTypeOf<never>();
    });
  });

  describe("DetectOverlap" satisfies keyof UtilityTypes, () => {
    test("should detect overlapping keys between first and rest", () => {
      type Source = { a: number; b: string; c: boolean };
      type Others = [
        { b: number; d: string; e: number },
        { c: string; e: number }
      ];

      expectTypeOf<DetectOverlap<Source, Others>>().toEqualTypeOf<"b" | "c">();
    });

    test("should return never when no overlaps exist", () => {
      type Source = { a: number };
      type Others = [{ b: string }, { c: boolean }];

      expectTypeOf<DetectOverlap<Source, Others>>().toEqualTypeOf<never>();
    });

    test("should detect multiple overlaps with single type", () => {
      type Source = { x: number; y: string; z: boolean };
      type Others = [{ x: string; y: number }];

      expectTypeOf<DetectOverlap<Source, Others>>().toEqualTypeOf<"x" | "y">();
    });
  });

  describe("OverlappingKeys" satisfies keyof UtilityTypes, () => {
    test("should detect all overlapping keys in tuple", () => {
      type A = { x: number; y: string };
      type B = { y: boolean; z: number };
      type C = { x: string; z: string };

      expectTypeOf<OverlappingKeys<[A, B, C]>>().toEqualTypeOf<
        "x" | "y" | "z"
      >();
    });

    test("should return never when no overlaps exist", () => {
      type A = { a: number };
      type B = { b: string };
      type C = { c: boolean };

      expectTypeOf<OverlappingKeys<[A, B, C]>>().toEqualTypeOf<never>();
    });

    test("should handle partial overlaps", () => {
      type A = { shared: number; uniqueA: string };
      type B = { shared: string; uniqueB: boolean };
      type C = { uniqueC: number };

      expectTypeOf<OverlappingKeys<[A, B, C]>>().toEqualTypeOf<"shared">();
    });

    test("should detect overlaps across non-adjacent types", () => {
      type A = { prop: number };
      type B = { other: string };
      type C = { prop: boolean };

      expectTypeOf<OverlappingKeys<[A, B, C]>>().toEqualTypeOf<"prop">();
    });
  });

  describe("ClassProperty" satisfies keyof UtilityTypes, () => {
    test("should extract property type from class constructor", () => {
      class Person {
        name: string = "John";
        age: number = 30;
      }

      expectTypeOf<
        ClassProperty<typeof Person, "name">
      >().toEqualTypeOf<string>();

      expectTypeOf<
        ClassProperty<typeof Person, "age">
      >().toEqualTypeOf<number>();
    });

    test("should be compataible with Constructor type", () => {
      class Person {
        name: string = "John";
        age: number = 30;
      }

      expectTypeOf<ClassProperty<Constructor<Person>, "model">>().toEqualTypeOf<
        ClassProperty<typeof Person, "model">
      >();
    });

    test("should return never for non-existent properties", () => {
      class Example {
        existing: string = "value";
      }

      expectTypeOf<
        ClassProperty<typeof Example, "notThere">
      >().toEqualTypeOf<never>();
    });

    test("should work with methods", () => {
      class Calculator {
        add(a: number, b: number): number {
          return a + b;
        }
      }

      expectTypeOf<ClassProperty<typeof Calculator, "add">>().toEqualTypeOf<
        (a: number, b: number) => number
      >();
    });

    test("should handle complex property types", () => {
      class Complex {
        nested: { inner: { value: number } } = { inner: { value: 42 } };
        tuple: [string, number] = ["test", 123];
      }

      expectTypeOf<ClassProperty<typeof Complex, "nested">>().toEqualTypeOf<{
        inner: { value: number };
      }>();
      expectTypeOf<ClassProperty<typeof Complex, "tuple">>().toEqualTypeOf<
        [string, number]
      >();
    });
  });

  describe("ClassHasProperty" satisfies keyof UtilityTypes, () => {
    test("should check if property exists with default true/false", () => {
      class Person {
        name: string = "John";
        age: number = 30;
      }

      expectTypeOf<
        ClassHasProperty<typeof Person, "name">
      >().toEqualTypeOf<true>();
      expectTypeOf<
        ClassHasProperty<typeof Person, "missing">
      >().toEqualTypeOf<false>();
    });

    test("should use custom If/Else values", () => {
      class Example {
        value: number = 42;
      }

      expectTypeOf<
        ClassHasProperty<typeof Example, "value", "yes", "no">
      >().toEqualTypeOf<"yes">();
      expectTypeOf<
        ClassHasProperty<typeof Example, "missing", "yes", "no">
      >().toEqualTypeOf<"no">();
    });

    test("should return Else for non-constructor types", () => {
      expectTypeOf<ClassHasProperty<string, "length">>().toEqualTypeOf<false>();
      expectTypeOf<
        ClassHasProperty<number, "toString", "has", "not">
      >().toEqualTypeOf<"not">();
    });
  });

  describe("SubTuples" satisfies keyof UtilityTypes, () => {
    test("should generate all (non-empty) sub-tuples of a given tuple", () => {
      type Input = [number, string, boolean];
      type Expected =
        | [number]
        | [string]
        | [boolean]
        | [number, string]
        | [number, boolean]
        | [string, boolean]
        | [number, string, boolean];

      expectTypeOf<SubTuples<Input>>().toEqualTypeOf<Expected>();
    });
  });

  describe("NullableParameterTuple" satisfies keyof UtilityTypes, () => {
    test("should create nullable parameter tuples for class methods", () => {
      class A {
        method(x: number, y: string): void {}
      }
      class B {
        method(): void {}
      }
      class C {
        method(flag: boolean): void {}
      }

      expectTypeOf<
        NullableParameterTuple<[typeof A, typeof B, typeof C], "method">
      >().toEqualTypeOf<[[number, string], null | undefined, [boolean]]>();
    });
  });

  describe(
    name("ReadonlyKeys", "NonReadonlyKeys", "IsReadonlyClassProperty"),
    () => {
      test("should determine if a property is readonly", () => {
        class Example {
          readonly readOnlyProp: string = "constant";
          mutableProp: number = 42;
        }

        expectTypeOf<ReadonlyKeys<Example>>().toEqualTypeOf<"readOnlyProp">();
        expectTypeOf<NonReadonlyKeys<Example>>().toEqualTypeOf<"mutableProp">();
        expectTypeOf<
          IsReadonlyClassProperty<typeof Example, "readOnlyProp">
        >().toEqualTypeOf<true>();
        expectTypeOf<
          IsReadonlyClassProperty<typeof Example, "mutableProp">
        >().toEqualTypeOf<false>();
      });
    }
  );
});
