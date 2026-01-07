import { test, describe, expectTypeOf } from "vitest";
import type {
  ResolveConflict,
  MergeAndResolveConflicts,
  ConflictResolutionMap,
  AllConstructorParameters,
  ClassesContainingKey,
  GetInstance,
} from "../../../release/mixin";
import { mixin } from "../../../release";

type Types = {
  ConflictMap: ConflictResolutionMap<any[]>;
  MergeAndResolveConflicts: MergeAndResolveConflicts<any[], any>;
  AllConstructorParameters: AllConstructorParameters<any[]>;
  ClassListContainingKey: ClassesContainingKey<any[], string>;
  ResolveConflict: ResolveConflict<any[], never>;
};

describe("Types", () => {
  describe("ResolveConflict" satisfies keyof Types, () => {
    test("should correctly identify conflict map types", () => {
      class A {
        test(a: number) {}
      }

      class B {
        test(b: string) {}
      }

      class C {
        test = "";
      }

      type Args = {
        A: [a: number];
        B: [b: string];
        C: null | undefined;
        Instance: GetInstance<[typeof A, typeof B, typeof C]>;
      };

      type IsResolution<T> = T extends ResolveConflict<
        [typeof A, typeof B, typeof C],
        "test"
      >
        ? true
        : false;

      // Omit the conflicting property
      expectTypeOf<IsResolution<null>>().toEqualTypeOf<true>();

      // Take implementation from a specific class
      expectTypeOf<
        IsResolution<typeof A | typeof B | typeof C>
      >().toEqualTypeOf<true>();

      // Provide a resolver tuple with custom resolver function
      expectTypeOf<
        IsResolution<
          | readonly [resolver: (instance: Args["Instance"]) => any]
          | readonly [
              typeof A,
              typeof B,
              typeof C,
              resolver: (
                ...args: [Args["A"], Args["B"], Args["C"], Args["Instance"]]
              ) => any
            ]
          | readonly [
              typeof A,
              resolver: (...args: [...Args["A"], Args["Instance"]]) => any
            ]
          | readonly [
              typeof B,
              resolver: (...args: [...Args["B"], Args["Instance"]]) => any
            ]
          | readonly [
              typeof C,
              resolver: (...args: [Args["C"], Args["Instance"]]) => any
            ]
          | readonly [
              typeof A,
              typeof B,
              resolver: (
                ...args: [Args["A"], Args["B"], Args["Instance"]]
              ) => any
            ]
          | readonly [
              typeof A,
              typeof C,
              resolver: (
                ...args: [Args["A"], Args["C"], Args["Instance"]]
              ) => any
            ]
          | readonly [
              typeof B,
              typeof C,
              resolver: (
                ...args: [Args["B"], Args["C"], Args["Instance"]]
              ) => any
            ]
        >
      >().toEqualTypeOf<true>();
    });
  });

  describe("ConflictMap" satisfies keyof Types, () => {
    test("should correctly identify conflict map types", () => {
      class A {
        a: number = 0;
        overlappingProperty: string = "A";
      }

      class B {
        b: string = "B";
        overlappingProperty: number = 0;
      }

      type IsResolution<T> = T extends ConflictResolutionMap<
        [typeof A, typeof B]
      >
        ? true
        : false;

      const resolutionA = { overlappingProperty: A };
      expectTypeOf<IsResolution<typeof resolutionA>>().toEqualTypeOf<true>();

      const resolutionB = { overlappingProperty: B };
      expectTypeOf<IsResolution<typeof resolutionB>>().toEqualTypeOf<true>();

      const resolutionNull = { overlappingProperty: null };
      expectTypeOf<IsResolution<typeof resolutionNull>>().toEqualTypeOf<true>();

      const resolver = mixin.resolver([A, B]);

      const resolutionCustomA = resolver.overlappingProperty(
        A,
        (a, instance) => 0
      );
      expectTypeOf<
        IsResolution<typeof resolutionCustomA>
      >().toEqualTypeOf<true>();

      const resolutionCustomB = resolver.overlappingProperty(
        B,
        (b, instance) => ""
      );
      expectTypeOf<
        IsResolution<typeof resolutionCustomB>
      >().toEqualTypeOf<true>();

      const resolutionCustomBoth = resolver.overlappingProperty(
        A,
        B,
        (a, b, instance) => {}
      );
      expectTypeOf<
        IsResolution<typeof resolutionCustomBoth>
      >().toEqualTypeOf<true>();

      const resolutionCustomNeither = resolver.overlappingProperty(
        null,
        (instance) => 405 as const
      );
      expectTypeOf<
        IsResolution<typeof resolutionCustomNeither>
      >().toEqualTypeOf<true>();
    });
  });

  describe("MergeAndResolveConflicts" satisfies keyof Types, () => {
    test("should correctly identify merge and resolve conflicts types", () => {
      class A {
        a: number = 0;
        readonly overlappingProperty: string = "A";
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
        readonly overlappingProperty: string;
      }>();

      expectTypeOf<MergedOnB>().toEqualTypeOf<{
        a: number;
        b: string;
        overlappingProperty: number;
      }>();

      type MergedOnNull = MergeAndResolveConflicts<
        [typeof A, typeof B],
        { overlappingProperty: null }
      >;

      expectTypeOf<MergedOnNull>().toEqualTypeOf<{
        a: number;
        b: string;
      }>();

      const resolver = mixin.resolver([A, B]);

      const resolutonOnCustomNeither = resolver.overlappingProperty(
        null,
        (instance) => {}
      );

      const resolutionCustomOnA = resolver.overlappingProperty(
        A,
        (a, instance) => 1 as const
      );

      type MergedOnCustomA = MergeAndResolveConflicts<
        [typeof A, typeof B],
        typeof resolutionCustomOnA
      >;

      expectTypeOf<MergedOnCustomA>().toEqualTypeOf<{
        a: number;
        b: string;
        overlappingProperty: () => 1;
      }>();

      const resolutionCustomOnB = resolver.overlappingProperty(
        B,
        (b, instance) => "hello" as const
      );

      type MergedOnCustomB = MergeAndResolveConflicts<
        [typeof A, typeof B],
        typeof resolutionCustomOnB
      >;

      expectTypeOf<MergedOnCustomB>().toEqualTypeOf<{
        a: number;
        b: string;
        overlappingProperty: () => "hello";
      }>();

      const resolutionCustomOnBoth = resolver.overlappingProperty(
        A,
        B,
        (a, b, instance) => true as const
      );

      type MergedOnCustomBoth = MergeAndResolveConflicts<
        [typeof A, typeof B],
        typeof resolutionCustomOnBoth
      >;

      expectTypeOf<MergedOnCustomBoth>().toEqualTypeOf<{
        a: number;
        b: string;
        overlappingProperty: () => true;
      }>();

      const resolutionCustomOnNeither = resolver.overlappingProperty(
        null,
        (instance) => 405 as const
      );

      type MergedOnCustomNeither = MergeAndResolveConflicts<
        [typeof A, typeof B],
        typeof resolutionCustomOnNeither
      >;

      expectTypeOf<MergedOnCustomNeither>().toEqualTypeOf<{
        a: number;
        b: string;
        overlappingProperty: () => 405;
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
      >().toEqualTypeOf<[[number], [string, boolean], null | undefined]>();

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

  describe("ClassListContainingKey" satisfies keyof Types, () => {
    test("should correctly identify class list containing key types", () => {
      class A {
        overlappingProperty: string = "A";
      }

      class B {
        overlappingProperty: number = 0;
      }

      class C {
        uniqueProperty: boolean = true;
      }

      type ClassList = ClassesContainingKey<
        [typeof A, typeof B, typeof C],
        "overlappingProperty"
      >;

      expectTypeOf<ClassList>().toEqualTypeOf<[typeof A, typeof B]>();
    });
  });
});
