import { describe, expect, it } from "vitest";
import { toPersistedRecord } from "#src/persisted-record";
import { createTestSubagent } from "#test/helpers/make-subagent";

describe("toPersistedRecord", () => {
	it("copies the persisted fields off the record, and no others", () => {
		const turnBudget = { maxTurns: 5, used: 2, phase: "within" } as const;
		const record = createTestSubagent({
			id: "agent-9",
			type: "Explore",
			description: "map the module",
			status: "error",
			result: "partial",
			error: "boom",
			turnBudget,
			startedAt: 1000,
			completedAt: 2500,
			toolUses: 7,
			sessionReady: true,
			outputFile: "/tasks/a.jsonl",
		});

		expect(toPersistedRecord(record)).toStrictEqual({
			id: "agent-9",
			type: "Explore",
			description: "map the module",
			status: "error",
			result: "partial",
			error: "boom",
			turnBudget,
			startedAt: 1000,
			completedAt: 2500,
			outputFile: "/tasks/a.jsonl",
			toolUses: 7,
		});
	});
});
