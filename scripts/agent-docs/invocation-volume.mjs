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

import { markdownBody } from "./frontmatter.mjs";

/**
 * A template's match key: the first `# ` line of its body, or "" when the
 * body has none. The first occurrence matters — a template can carry a later
 * H1 inside a fenced example.
 *
 * @param {string} markdown
 */
export function templateHeading(markdown) {
  return (
    markdownBody(markdown)
      .split("\n")
      .find((line) => line.startsWith("# ")) ?? ""
  );
}

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

/**
 * One row per file: body words, invocations counted from `events`, and their
 * product, largest volume first. Events whose kind and key match no file are
 * dropped; a file no event matches reports zero.
 *
 * @param {{ kind: string, file: string, key: string, words: number }[]} files
 * @param {Iterable<{ kind: string, key: string }>} events
 */
export function volumeRows(files, events) {
  const counts = new Map();
  for (const { kind, key } of events) {
    const id = `${kind}\u0000${key}`;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return files
    .map(({ kind, file, key, words }) => {
      const invocations = counts.get(`${kind}\u0000${key}`) ?? 0;
      return { kind, file, words, invocations, volume: words * invocations };
    })
    .sort((a, b) => b.volume - a.volume);
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
