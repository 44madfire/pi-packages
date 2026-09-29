import { describe, expect, it } from "vitest";

import { invocations } from "../../scripts/agent-docs/invocation-volume.mjs";

const WINDOW = { since: "2026-09-01", until: "2026-09-29" };
const INSIDE = "2026-09-15T12:00:00.000Z";

/** A user message as Pi writes it: an expanded template is its text. */
function user(text, timestamp = INSIDE) {
  return JSON.stringify({
    type: "message",
    timestamp,
    message: { role: "user", content: [{ type: "text", text }] },
  });
}

/** An assistant message carrying one tool call. */
function toolCall(name, args, timestamp = INSIDE) {
  return JSON.stringify({
    type: "message",
    timestamp,
    message: {
      role: "assistant",
      content: [
        { type: "text", text: "Dispatching." },
        { type: "toolCall", name, arguments: args },
      ],
    },
  });
}

function collect(lines, window = WINDOW) {
  return [...invocations(lines, window)];
}

describe("invocations", () => {
  describe("templates", () => {
    it("yields the first line of each user message as a template key", () => {
      expect(
        collect([
          user("# Plan a GitHub issue\n\nIssue number: `935`"),
          user("# Ship the implementation\n\nArgument: `935`"),
        ]),
      ).toEqual([
        { kind: "template", key: "# Plan a GitHub issue" },
        { kind: "template", key: "# Ship the implementation" },
      ]);
    });

    it("keys a message that quotes a heading later on by its own first line", () => {
      expect(
        collect([user("Why did step 3 do that?\n\n# Plan a GitHub issue")]),
      ).toEqual([{ kind: "template", key: "Why did step 3 do that?" }]);
    });

    it("reads a user message whose content is a plain string", () => {
      const line = JSON.stringify({
        type: "message",
        timestamp: INSIDE,
        message: { role: "user", content: "# Triage the backlog\n\nbody" },
      });
      expect(collect([line])).toEqual([
        { kind: "template", key: "# Triage the backlog" },
      ]);
    });
  });

  describe("agents", () => {
    it("yields the subagent_type of each subagent dispatch", () => {
      expect(
        collect([
          toolCall("subagent", {
            subagent_type: "pre-completion-reviewer",
            prompt: "Review issue #935.",
          }),
        ]),
      ).toEqual([{ kind: "agent", key: "pre-completion-reviewer" }]);
    });

    it("skips a resumed dispatch, which re-sends no system prompt", () => {
      expect(
        collect([
          toolCall("subagent", {
            subagent_type: "tidy-first-assessor",
            prompt: "Answer.",
            resume: "86055480-b0a7-442",
          }),
        ]),
      ).toEqual([]);
    });

    it("ignores a different tool that happens to carry a subagent_type", () => {
      // The "subagent" value gets the line past the cheap text pre-filter, so
      // the tool-name check is what has to exclude it.
      expect(
        collect([
          toolCall("steer_subagent", {
            subagent_type: "tidy-first-assessor",
            message: "subagent",
          }),
        ]),
      ).toEqual([]);
    });
  });

  describe("window", () => {
    it("skips entries before since", () => {
      expect(
        collect([user("# Plan a GitHub issue", "2026-08-31T23:59:59.000Z")]),
      ).toEqual([]);
    });

    it("includes an entry at the start of the since day", () => {
      expect(
        collect([user("# Plan a GitHub issue", "2026-09-01T00:00:00.000Z")]),
      ).toEqual([{ kind: "template", key: "# Plan a GitHub issue" }]);
    });

    it("skips entries on or after until", () => {
      expect(
        collect([
          user("# Plan a GitHub issue", "2026-09-29T00:00:00.000Z"),
          toolCall(
            "subagent",
            { subagent_type: "pre-completion-reviewer" },
            "2026-10-02T08:00:00.000Z",
          ),
        ]),
      ).toEqual([]);
    });
  });

  describe("other entries", () => {
    it("skips non-message entries, unparseable lines, and assistant text", () => {
      expect(
        collect([
          JSON.stringify({ type: "session_info", name: "#935 TDD — x" }),
          "{not json",
          "",
          JSON.stringify({
            type: "message",
            timestamp: INSIDE,
            message: {
              role: "assistant",
              content: [{ type: "text", text: "# Plan a GitHub issue" }],
            },
          }),
        ]),
      ).toEqual([]);
    });
  });
});
