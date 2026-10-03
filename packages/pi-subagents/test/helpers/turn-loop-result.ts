import type { ChildCompletedEvent } from "#src/lifecycle/child-lifecycle";
import type { TurnLoopResult } from "#src/lifecycle/subagent-session";

/** A turn loop that ran to completion with no turn-limit intervention. */
export function turnLoopResult(overrides: Partial<TurnLoopResult> = {}): TurnLoopResult {
	return {
		responseText: "done",
		aborted: false,
		steered: false,
		...overrides,
	};
}

/** A `subagents:child:completed` payload for a run with no turn-limit intervention. */
export function childCompletedEvent(overrides: Partial<ChildCompletedEvent> = {}): ChildCompletedEvent {
	return {
		sessionDir: "/sessions/child",
		agentName: "Explore",
		aborted: false,
		steered: false,
		...overrides,
	};
}
