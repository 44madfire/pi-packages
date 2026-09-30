import type { PromptNotificationChannel } from "#src/config/config-schema";

const BEL = "\x07";
const OSC = "\x1b]";

/** What a prompt notification says: OSC 777 carries both fields. */
export interface PromptNotice {
  readonly title: string;
  readonly body: string;
}

/**
 * The bytes that ask a terminal for attention as a permission dialog opens.
 *
 * One sequence per configured channel, in configured order; an empty list
 * renders nothing. Every field is stripped of control characters, so it cannot
 * end a sequence early or start another one.
 */
export function renderPromptNotification(
  channels: readonly PromptNotificationChannel[],
  notice: PromptNotice,
): string {
  const clean: PromptNotice = {
    title: withoutControlCharacters(notice.title),
    body: withoutControlCharacters(notice.body),
  };
  return channels.map((channel) => renderChannel(channel, clean)).join("");
}

function renderChannel(
  channel: PromptNotificationChannel,
  notice: PromptNotice,
): string {
  switch (channel) {
    case "bell":
      return BEL;
    case "osc9":
      return `${OSC}9;${notice.body}${BEL}`;
    case "osc777":
      return `${OSC}777;notify;${osc777Field(notice.title)};${osc777Field(notice.body)}${BEL}`;
  }
}

/** `;` separates OSC 777's fields, so one inside a field would split it. */
function osc777Field(text: string): string {
  return text.replaceAll(";", ":");
}

function withoutControlCharacters(value: string): string {
  // Code points, not grapheme clusters: a control character is always one.
  return Array.from(value)
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code > 31 && code !== 127;
    })
    .join("");
}
