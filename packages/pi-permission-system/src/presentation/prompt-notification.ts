import type { PromptNotificationChannel } from "#src/config/config-schema";

const BEL = "\x07";
const OSC = "\x1b]";

/** The OSC 777 title; the body carries the dialog title. */
const OSC_777_TITLE = "pi";

/**
 * The bytes that ask a terminal for attention as a permission dialog opens.
 *
 * One sequence per configured channel, in configured order; an empty list
 * renders nothing. The message is stripped of control characters, so it cannot
 * end a sequence early or start another one.
 */
export function renderPromptNotification(
  channels: readonly PromptNotificationChannel[],
  message: string,
): string {
  const text = withoutControlCharacters(message);
  return channels.map((channel) => renderChannel(channel, text)).join("");
}

function renderChannel(
  channel: PromptNotificationChannel,
  text: string,
): string {
  switch (channel) {
    case "bell":
      return BEL;
    case "osc9":
      return `${OSC}9;${text}${BEL}`;
    case "osc777":
      // `;` separates OSC 777's fields, so one in the body would split it.
      return `${OSC}777;notify;${OSC_777_TITLE};${text.replaceAll(";", ":")}${BEL}`;
  }
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
