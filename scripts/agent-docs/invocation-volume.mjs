#!/usr/bin/env node
// What the prompt templates and subagent definitions cost, by use.
//
// A template's body is paid for when it is invoked: Pi records the expanded
// template as a user message whose first line is the template's H1, and it
// stays in context for the rest of the session. A subagent definition's body
// is the child's system prompt, paid on every dispatch. So the cost of either
// class is its body words times its invocations — the workflow corpus's
// counterpart to always-loaded.mjs.
//
// Reads the same machine-local session store as model-usage.mjs.

/**
 * Every template invocation and subagent dispatch in one transcript, in order.
 *
 * A template event's key is the first line of a user message's text — an
 * expanded template begins with its H1, and any other message simply matches
 * no template. An agent event's key is a `subagent` call's `subagent_type`;
 * a resumed dispatch continues an existing child and is not counted.
 *
 * Only entries whose timestamp t satisfies since <= t < until are yielded,
 * where the bounds are YYYY-MM-DD dates compared against ISO timestamps.
 *
 * @param {Iterable<string>} lines JSONL entries, one per line
 * @param {{ since: string, until: string }} window
 * @returns {Generator<{ kind: "template" | "agent", key: string }>}
 */
export function* invocations(lines, { since, until }) {
  for (const line of lines) {
    // Cheap pre-filter: transcripts are large and mostly tool payloads.
    if (!line.includes('"user"') && !line.includes('"subagent"')) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.type !== "message" || typeof entry.timestamp !== "string")
      continue;
    if (entry.timestamp < since || entry.timestamp >= until) continue;

    const { role, content } = entry.message ?? {};
    if (role === "user") {
      yield { kind: "template", key: firstLine(content) };
    } else if (role === "assistant" && Array.isArray(content)) {
      for (const part of content) {
        if (isDispatch(part)) {
          yield { kind: "agent", key: part.arguments.subagent_type };
        }
      }
    }
  }
}

function firstLine(content) {
  const text =
    typeof content === "string"
      ? content
      : (content?.find((part) => part.type === "text")?.text ?? "");
  return text.split("\n")[0];
}

function isDispatch(part) {
  return (
    part.type === "toolCall" &&
    part.name === "subagent" &&
    typeof part.arguments?.subagent_type === "string" &&
    part.arguments.resume === undefined
  );
}
