// executors.js — stub Station executors for the document-review demo.
// None of these call a live model or make a network request; they are
// deterministic functions standing in for "wherever you'd plug in your
// own model call or business logic." The framework never requires a live
// model call to prove itself — a real project swaps these for something
// that calls whatever it wants.

/**
 * @param {{topic: string, brief: string}} input
 */
export function draftExecutor(input) {
  const draft = `${input.topic}: ${input.brief}`;
  const word_count = draft.trim().split(/\s+/).filter(Boolean).length;
  return { draft, word_count };
}

/**
 * Deliberately violates Drafter's own output_contract (word_count comes
 * back as a string, not the integer the contract promises) so the demo
 * can show the Coupling's boundary check rejecting a malformed handoff —
 * distinct from the Floor's own pre-check, which this output still passes.
 * @param {{topic: string, brief: string}} input
 */
export function brokenDraftExecutor(input) {
  const draft = `${input.topic}: ${input.brief}`;
  return { draft, word_count: 'lots' };
}

/**
 * @param {{draft: string, word_count: number}} input
 */
export function reviewExecutor(input) {
  const meetsBar = input.word_count >= 8;
  const comments = meetsBar
    ? ['Reads clearly.', 'Meets the minimum length bar.']
    : ['Too short — needs more substance before it can publish.'];
  return { draft: input.draft, approved: meetsBar, comments };
}

/**
 * @param {{draft: string, approved: boolean, comments: string[]}} input
 */
export function publishExecutor(input) {
  if (!input.approved) {
    // A real Station could refuse to run at all here; instead we let the
    // Gate's Floor catch it, so the Trail shows exactly why publishing
    // stopped rather than the pipeline silently skipping the step.
    return { published: false, url: '' };
  }
  const slug = input.draft
    .slice(0, 24)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return { published: true, url: `https://example.local/published/${slug || 'untitled'}` };
}
