/**
 * HarnessDefinitions — registry and query helpers for built-in harness definitions.
 *
 * @module provider/harnesses/HarnessDefinitions
 */
import {
  BUILT_IN_HARNESS_DEFINITIONS,
  HarnessDefinition,
  HarnessKind,
  getHarnessDefinition as getContractHarnessDefinition,
} from "@rune/contracts";

export { BUILT_IN_HARNESS_DEFINITIONS };

export const getHarnessDefinition = (
  kind: HarnessKind | string,
): HarnessDefinition | undefined => {
  return getContractHarnessDefinition(kind);
};

export const isHarnessKindKnown = (kind: string): boolean => {
  return BUILT_IN_HARNESS_DEFINITIONS.some((def) => def.kind === kind);
};
