/**
 * persisted-record.ts — The `subagents:record` session-entry contract.
 *
 * Each terminal run is appended to the parent session as a custom entry, so the
 * session file outlives the in-memory `SubagentManager` (a `/reload` rebuilds
 * the extension; a `/resume` reopens the file). This module owns the entry's
 * shape on both sides: the writer (`SubagentEventsObserver`) builds it here,
 * and readers parse it here.
 */

import type { SubagentStatus } from "#src/lifecycle/subagent-state";
import type { TurnBudget } from "#src/lifecycle/turn-limits";
import type { SubagentType } from "#src/types";

/** The `customType` every persisted run record is appended under. */
export const SUBAGENT_RECORD_ENTRY = "subagents:record";

/** What is appended for each terminal run. */
export interface PersistedSubagentRecord {
	readonly id: string;
	readonly type: SubagentType;
	readonly description: string;
	readonly status: SubagentStatus;
	readonly result: string | undefined;
	readonly error: string | undefined;
	readonly turnBudget: TurnBudget | undefined;
	readonly startedAt: number;
	readonly completedAt: number | undefined;
}

/**
 * Build the entry for one terminal run. A `Subagent` satisfies the parameter
 * structurally; copying field by field keeps everything else off the entry.
 */
export function toPersistedRecord(record: PersistedSubagentRecord): PersistedSubagentRecord {
	return {
		id: record.id,
		type: record.type,
		description: record.description,
		status: record.status,
		result: record.result,
		error: record.error,
		turnBudget: record.turnBudget,
		startedAt: record.startedAt,
		completedAt: record.completedAt,
	};
}
