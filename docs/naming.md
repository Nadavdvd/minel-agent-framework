# Naming

Six words this repo uses on purpose instead of the generic terms ("agent," "validator," "guardrail," "memory") the rest of the field reaches for. Each one names a specific mechanism, not a vibe — if you're extending the framework, reuse these rather than inventing new ones for the same job.

### The Station

A configured post in a pipeline: a name, a one-line purpose, what it needs handed to it, and what it must hand out. A Station is data, not a persona — it has no built-in identity, no fixed prompt, no assumption about what it's "for." The framework ships zero of them. You declare however many a given pipeline needs — three, five, twelve — in a config file, and that config *is* the Station.

### The Coupling

The check that runs at the seam between two Stations. Before a handoff is allowed to proceed, the Coupling confirms the producing Station's output actually satisfies its own declared shape, and that the same output satisfies the next Station's declared input shape. Either mismatch is a hard rejection — the run stops and says exactly which field, in which contract, didn't fit. Nothing gets coerced, defaulted, or silently dropped to force a bad handoff through.

### The Gate

The umbrella name for everything that has to happen to a Station's output before it's allowed to leave the Station. It has three parts, below. A Gate call is not optional and not something a Station can skip by omission — every Station's output goes through one.

### The Floor

The part of the Gate that runs first, unconditionally, for every Station: deterministic, rule-based checks with no model call underneath them — required fields present, a length or format bound respected, an obvious duplicate caught. If the Floor rejects, the verdict is decided before anything more expensive (a scorer, a model call) ever runs.

### The Rungs — Clear / Flag / Hold

The three-value verdict the Gate returns, whether the deciding check was the Floor alone or the Floor plus an optional scorer layered on top:

- **Clear** — the output proceeds without anyone looking at it.
- **Flag** — the output proceeds, but the event is written down for a person to review later.
- **Hold** — the output does not proceed until a person acts on it.

A Floor rejection is always a Hold. Above the Floor, what maps to which Rung is a threshold you configure, not something fixed by the framework.

### The Cutoff

A single switch, checked before anything else in a Gate call, including the Floor. Engage it and every Gate in the pipeline returns Hold immediately, no matter what a Station's output actually looks like. It exists for the moment you need everything to stop and don't have time to reason about which rule should fire — flip it off when you're ready to resume.

### The Trail

The append-only record. One line per Station invocation, ever: which Station, a hash of what it was given, what it produced, the Gate's verdict, when, and which run it belongs to. Lines are never edited or removed once written — if something needs correcting, a new line gets appended, the old one stays exactly as it was.

### The Loopback

What turns the Trail from a record you could read into something a run actually does read. Before a Station runs, the Loopback can build a small digest from the Trail's history — recent pass/fail counts for that Station, the most recent reasons it Held — and hand that digest into the run's context. In this version, that's the whole mechanism: it reads the Trail and reports on it. It does not rewrite a Station's config, a Coupling's contract, or a prompt on its own. Anything past reporting is a layer you'd build on top, deliberately left out here.

---

These six terms are stable across the codebase, the docs, and the CLI's own output — a Trail line, a Gate verdict, and a README sentence all mean the same thing when they say "Hold." Keep it that way if you extend the framework.
