import { describe, expect, it } from "vitest";
import { childCompletedEvent, turnLoopResult } from "./turn-loop-result";

describe("turnLoopResult", () => {
	it("describes a run with no turn-limit intervention by default", () => {
		expect(turnLoopResult()).toEqual({ responseText: "done", aborted: false, steered: false });
	});

	it("applies overrides while keeping other defaults", () => {
		expect(turnLoopResult({ responseText: "partial", aborted: true })).toEqual({
			responseText: "partial",
			aborted: true,
			steered: false,
		});
	});
});

describe("childCompletedEvent", () => {
	it("describes a run with no turn-limit intervention by default", () => {
		expect(childCompletedEvent()).toEqual({
			sessionDir: "/sessions/child",
			agentName: "Explore",
			aborted: false,
			steered: false,
		});
	});

	it("applies overrides while keeping other defaults", () => {
		expect(childCompletedEvent({ agentName: "Plan", steered: true })).toEqual({
			sessionDir: "/sessions/child",
			agentName: "Plan",
			aborted: false,
			steered: true,
		});
	});
});
