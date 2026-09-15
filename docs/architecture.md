# Architecture

Seven small modules under `src/`, each with one job, wired together by `pipeline.js`. Nothing here is a framework-within-a-framework — it's a pipeline runner, a validator, and a couple of small append-only logs.

## The Station

A Station is data, not a persona: `{ name, purpose, input_contract, output_contract, prompt_template? }`. The framework ships zero built-in Stations. `prompt_template` is documentary only in v1 — the framework never executes it; a real project's executor decides what to do with it, including calling a model if it wants to.

## The Coupling

Every handoff between two Stations is checked two ways before it's allowed to proceed:

1. Does the producing Station's actual output satisfy its own declared `output_contract`?
2. Does that same output satisfy the next Station's declared `input_contract`?

Either check failing is a hard rejection — the run stops and reports exactly which field, in which contract, didn't match. Nothing is coerced or dropped to make a bad handoff fit.

## The Gate: the Floor, an optional scorer, and the Rungs

The Floor is a set of deterministic, non-model rules (required-field presence, a length bound, a duplicate check, a boolean-must-be-true check) that runs first, for every Station, unconditionally. It cannot be skipped by forgetting to configure a scorer.

Only if the Floor passes does an optional pluggable scorer run — a second model call, a heuristic, or nothing. Its score maps to the Rungs, the three-tier verdict vocabulary: **Clear** (proceed automatically), **Flag** (proceed, logged for review), **Hold** (never proceeds without further action). A Floor failure is always Hold.

## The Cutoff

A single persisted flag. When engaged, every Gate call returns Hold, immediately, before the Floor or the scorer even run — checked first, every time, network-wide. `minel-agents cutoff on|off|status`.

## The Trail

An append-only JSON Lines log: one line per Station invocation, per run — role, input hash, output, Gate verdict, timestamp, run ID. Appends are atomic on POSIX filesystems, so no lock is needed and no line is ever partially written. Nothing ever rewrites a line once it's on disk.

## The Loopback

A read-only digest built from the Trail: recent pass/fail counts per Station, and the most recent failure reasons. A future run can read this digest and inject it into its own context before it starts. v1 stops there — it never rewrites a Station, a Coupling, or the Trail on its own. That's a deliberate, smaller scope than an autonomous self-improvement loop; this module gives a consumer the raw material to build one on top if they want it.

## What a `pipeline.js` run actually does, in order

For each Station, in sequence:

1. Run its executor against the current input.
2. Run the Gate on the output (Cutoff check, then the Floor, then the optional scorer).
3. If the Gate returns Hold, stop — the run is `halted`.
4. Otherwise, check the output against the Station's own `output_contract`.
5. If there's a next Station, check the Coupling to it.
6. Either check failing stops the run — it is `rejected`, never coerced through.
7. Every step, pass or fail, writes one record to the Trail before moving on.

A run that makes it through every Station is `completed`, carrying the final output and the full list of Trail records written along the way.
