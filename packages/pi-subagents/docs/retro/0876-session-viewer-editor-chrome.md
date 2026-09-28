---
issue: 876
issue_title: "Apply editor-style chrome to the pi-subagents session viewer"
---

# Retro: #876 — Apply editor-style chrome to the pi-subagents session viewer

## Stage: Planning (2026-09-28T03:28:49Z)

### Session summary

Planned the session viewer's labeled header and footer rules (Pi editor style, coloured by the child's thinking level via `theme.getThinkingBorderColor`) and, at the operator's direction, folded in #954 (model tag in the agents widget).
The plan surfaces the child's model and thinking level through `AgentSession` → `SubagentSession` → `Subagent` delegating getters, a `TranscriptSource.sessionModel()` accessor, and a static `EntryHeading` on each `NavigationEntry`, all in 8 steps.

### Observations

- The operator first chose "#876 alone", then asked for a rich header (name, model, thinking) and thinking-level colour; that pulled in #954's data plumbing, so the scope widened to both issues. #954 is third-party (`the-matt-moo`); its `Subagent.model` getter is credited with `Co-authored-by` on steps 3 and 7.
- #954's proposed `this.subagentSession?.session?.model` is a Law of Demeter reach-through; the plan adds `SubagentSession.model`/`thinkingLevel` getters instead, per the operator's explicit "no LoD violations" constraint.
- The issue says Pi centres the working status; Pi's `custom-editor.ts` left-anchors it (only the overflow label is centred).
  Left anchoring chosen.
- Colour gate: operator rejected `dim` after a true-colour preview script (`/tmp/pane-colors.mjs`, `/tmp/pane-thinking.mjs`), then chose thinking-level colouring like the editor.
  I first read a stale catppuccin install under `~/.pi/agent/git/`; the live theme is `~/development/pi/pi-coding-agent-catppuccin` (settings `packages` entry).
  Values were identical, but read the `settings.json` `packages` path first next time.
- The comment in `TranscriptPane.render` (from `243bdb21`) claims a full-width row wraps; contradicted by pi-tui (throws only on `> width`), Pi's editor/`DynamicBorder`, and the pane's own current footer.
  The plan corrects it and asks `/tdd-plan` to eyeball a real session after step 6.
- Measured `buildSessionContext` on a real child JSONL: returns `model: { provider, modelId }` and `thinkingLevel`, so released snapshots get the header facts for free.
- Tidy-First assessor: accepted the shared-session-mock fixture step (step 1) and the local `TranscriptTheme` narrowing (folded into step 6 rather than a standalone commit, since it has no consumer before then).
  The `WidgetAgent` `makeAgent` fixture change was not needed as its own step because `model` is optional.
  It also caught that `renderRunningLines`/`renderFinishedLine` are tested in `test/widget-renderer.test.ts`, not `test/ui/agent-widget.test.ts`.

#### Deferred tidyings

- `src/lifecycle/subagent.ts`: the long one-line getter block (lines ~150–208) could be grouped; two more getters fit the existing pattern.
- `src/ui/display.ts`: the shared `Theme` name understates that it is the narrow rendering theme.
- `test/ui/agent-widget.test.ts`: eight sibling `describe("AgentWidget — …")` blocks could nest under one `describe("AgentWidget")`.
