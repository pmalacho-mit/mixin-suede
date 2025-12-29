import { test, describe, expectTypeOf } from "vitest";
import type {
  MergeAndResolveConflicts,
  ConflictMap,
  AllConstructorParameters,
  ClassListContainingKey,
} from "../release/mixin";

type Types = {
  ConflictMap: ConflictMap<any[]>;
  MergeAndResolveConflicts: MergeAndResolveConflicts<any[], any>;
  AllConstructorParameters: AllConstructorParameters<any[]>;
  ClassListContainingKey: ClassListContainingKey<any[], string>;
};

describe("Types", () => {
  describe("ConflictMap" satisfies keyof Types, () => {
    test("should correctly identify conflict map types", () => {
      class A {
        a: number = 0;
        overlappingProperty: string = "A";

        static hello() {}
      }

      class B {
        b: string = "B";
        overlappingProperty: number = 0;

        static hello() {}
      }

      expectTypeOf<ConflictMap<[typeof A, typeof B]>>().toEqualTypeOf<{
        overlappingProperty: typeof A | typeof B;
      }>();

      expectTypeOf<
        { overlappingProperty: typeof A } extends ConflictMap<
          [typeof A, typeof B]
        >
          ? true
          : false
      >().toEqualTypeOf<true>();

      const resolutionA = { overlappingProperty: A };

      expectTypeOf<
        typeof resolutionA extends ConflictMap<[typeof A, typeof B]>
          ? true
          : false
      >().toEqualTypeOf<true>();

      const resolutionB = { overlappingProperty: B };
      expectTypeOf<
        typeof resolutionB extends ConflictMap<[typeof A, typeof B]>
          ? true
          : false
      >().toEqualTypeOf<true>();
    });
  });

  describe("MergeAndResolveConflicts" satisfies keyof Types, () => {
    test("should correctly identify merge and resolve conflicts types", () => {
      class A {
        a: number = 0;
        overlappingProperty: string = "A";
      }

      class B {
        b: string = "B";
        overlappingProperty: number = 0;
      }

      type MergedOnA = MergeAndResolveConflicts<
        [typeof A, typeof B],
        { overlappingProperty: typeof A }
      >;

      type MergedOnB = MergeAndResolveConflicts<
        [typeof A, typeof B],
        { overlappingProperty: typeof B }
      >;

      expectTypeOf<MergedOnA>().toEqualTypeOf<{
        a: number;
        b: string;
        overlappingProperty: string;
      }>();

      expectTypeOf<MergedOnB>().toEqualTypeOf<{
        a: number;
        b: string;
        overlappingProperty: number;
      }>();
    });
  });

  describe("AllConstructorParameters" satisfies keyof Types, () => {
    test("should correctly identify all constructor parameters types", () => {
      class A {
        constructor(x: number) {}
      }

      class B {
        constructor(y: string, z: boolean) {}
      }

      class C {
        constructor() {}
      }

      expectTypeOf<
        AllConstructorParameters<[typeof A, typeof B, typeof C]>
      >().toEqualTypeOf<[[number], [string, boolean], null | undefined | []]>();

      const candidate = [[42], ["hello", true], null] as const;

      type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

      type Candidate = DeepWriteable<typeof candidate>;

      expectTypeOf<
        Candidate extends AllConstructorParameters<
          [typeof A, typeof B, typeof C]
        >
          ? true
          : false
      >().toEqualTypeOf<true>();
    });
  });
});
