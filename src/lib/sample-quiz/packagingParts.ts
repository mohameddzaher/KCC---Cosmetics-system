/**
 * The specs that are tabs of the packaging studio rather than steps of their
 * own — picking a cap without seeing it on the bottle is a worse question.
 *
 * Shared, not copied: the quiz folds these into one visual step, and the
 * step-order screen keeps them pinned directly behind the studio instead of
 * letting one be dragged somewhere it would never appear. Two readers, one
 * list, so they cannot drift apart.
 */
export const PACKAGING_PART_KEYS: Record<string, 'cap' | 'label' | 'finish' | 'color'> = {
  'package-cap': 'cap',
  'package-label': 'label',
  'package-finish': 'finish',
  'package-color': 'color',
};

/** The spec whose step the parts above ride inside. */
export const PACKAGING_STEP_KEY = 'product-packaging';

/**
 * The full save sequence for the step-order screen.
 *
 * Pure so it can be tested on its own: getting it wrong would scramble the step
 * order of every product at once. Two rules it has to hold.
 *
 *  1. The studio's tabs follow the studio immediately. They are not steps, and
 *     an order that separated them would describe a screen that cannot exist.
 *  2. A spec the client never mentioned keeps its place at the end rather than
 *     losing its order, so a stale tab cannot scramble the quiz.
 *
 * @param requested  step keys in the order the admin dragged them into
 * @param known      every spec key that exists as a library
 * @param current    each spec key's present sortOrder, for the ones left out
 */
export function buildStepSequence(
  requested: string[],
  known: Set<string>,
  current: Map<string, number>
): string[] {
  const isPart = (k: string) => !!PACKAGING_PART_KEYS[k];
  const parts = Object.keys(PACKAGING_PART_KEYS).sort(
    (a, b) => (current.get(a) ?? 99) - (current.get(b) ?? 99)
  );

  const seen = new Set<string>();
  const steps = requested.filter((k) => {
    // `current` is the gate, not `known`: a library that no product carries is
    // not a step, and letting one in would take an index and shift every real
    // step along by one.
    if (!known.has(k) || !current.has(k) || isPart(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const leftOut = [...current.keys()]
    .filter((k) => !isPart(k) && !seen.has(k))
    .sort((a, b) => (current.get(a) ?? 0) - (current.get(b) ?? 0));

  const sequence: string[] = [];
  for (const key of [...steps, ...leftOut]) {
    sequence.push(key);
    if (key === PACKAGING_STEP_KEY) sequence.push(...parts.filter((p) => current.has(p)));
  }
  return sequence;
}
