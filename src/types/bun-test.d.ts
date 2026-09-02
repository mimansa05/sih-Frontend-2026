/**
 * Minimal ambient declaration for bun's built-in test runner.
 *
 * `bun test` needs no package installed, but `tsc` still has to be told the
 * module exists. Declaring it here rather than adding @types/bun keeps the
 * lockfile untouched — it syncs to Lovable — and, unlike excluding test files
 * from the project, keeps them type-checked: a test that builds a domain
 * object still fails the build when that object's shape changes.
 *
 * Only the matchers this codebase actually uses are declared. Add to it when a
 * test needs another one.
 */
declare module "bun:test" {
  interface Matchers {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toContain(expected: unknown): void;
    toMatch(expected: RegExp | string): void;
    toBeDefined(): void;
    toBeGreaterThan(expected: number): void;
    readonly not: Matchers;
  }
  export function expect(actual: unknown): Matchers;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
}
