import type { ArgWord } from "#src/access-intent/bash/node-text";

/**
 * Argument words the source spells exactly, as `readArgWord` would read them
 * from literal source text.
 */
export function literalArgWords(...values: string[]): ArgWord[] {
  return values.map((value) => ({ value, computed: false }));
}
