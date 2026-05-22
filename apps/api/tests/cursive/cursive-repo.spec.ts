import { describe, expect, it } from "vitest";
import { CursiveViolationTypeSchema } from "../../../../packages/shared/src/contracts/cursive";
import { createCursiveRepo } from "../../src/modules/cursive/cursive.repo";

describe("createCursiveRepo", () => {
  it("returns the cross-bureau balance mismatch definition with aligned workflow metadata", () => {
    const repo = createCursiveRepo();
    const violation = repo.getViolationDefinition(
      "different_balances_across_bureaus",
    );

    expect(violation).toMatchObject({
      doctrine: "cross_bureau_inconsistency",
      evidencePosture: "cross_bureau_inconsistency",
      id: "different_balances_across_bureaus",
    });
    expect(
      violation?.controlledAssertions.map((item) => item.label),
    ).toContain(
      "This account is reported with inconsistent balances across bureaus",
    );
  });

  it("lists one canonical definition for every shared violation id", () => {
    const repo = createCursiveRepo();
    const definitions = repo.listViolationDefinitions();

    expect(definitions.map((definition) => definition.id)).toEqual(
      CursiveViolationTypeSchema.options,
    );

    for (const definition of definitions) {
      expect(definition.doctrine).toBe(definition.evidencePosture);
      expect(repo.getViolationDefinition(definition.id)).toBe(definition);
    }
  });

  it("returns frozen canonical definitions so the lookup table cannot be mutated at runtime", () => {
    const repo = createCursiveRepo();
    const definition = repo.getViolationDefinition("account_not_mine");

    expect(definition).not.toBeNull();
    expect(Object.isFrozen(definition)).toBe(true);
    expect(Object.isFrozen(definition?.controlledAssertions)).toBe(true);
    expect(Object.isFrozen(definition?.controlledAssertions[0])).toBe(true);
  });
});
