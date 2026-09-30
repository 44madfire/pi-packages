import { describe, expect, it } from "vitest";
import { renderPromptNotification } from "#src/presentation/prompt-notification";

const BEL = "\x07";
const ESC = "\x1b";

describe("renderPromptNotification", () => {
  describe("each channel", () => {
    it("writes a bare BEL for bell", () => {
      expect(renderPromptNotification(["bell"], "Permission Required")).toBe(
        BEL,
      );
    });

    it("writes an OSC 9 notification for osc9", () => {
      expect(renderPromptNotification(["osc9"], "Permission Required")).toBe(
        `${ESC}]9;Permission Required${BEL}`,
      );
    });

    it("writes an OSC 777 notification titled pi for osc777", () => {
      expect(renderPromptNotification(["osc777"], "Permission Required")).toBe(
        `${ESC}]777;notify;pi;Permission Required${BEL}`,
      );
    });
  });

  describe("channel lists", () => {
    it("concatenates the channels in configured order", () => {
      expect(
        renderPromptNotification(["osc777", "bell"], "Permission Required"),
      ).toBe(`${ESC}]777;notify;pi;Permission Required${BEL}${BEL}`);
    });

    it("renders nothing for an empty list", () => {
      expect(renderPromptNotification([], "Permission Required")).toBe("");
    });
  });

  describe("message sanitizing", () => {
    // A control character in the message could terminate the sequence early
    // or start a new one, so none survives into either OSC body.
    const hostile = `a${BEL}b${ESC}c\x7fd;e`;

    it("drops control characters and keeps semicolons in osc9", () => {
      expect(renderPromptNotification(["osc9"], hostile)).toBe(
        `${ESC}]9;abcd;e${BEL}`,
      );
    });

    it("drops control characters and turns semicolons into colons in osc777", () => {
      // A semicolon separates the OSC 777 fields, so one in the body would
      // split it.
      expect(renderPromptNotification(["osc777"], hostile)).toBe(
        `${ESC}]777;notify;pi;abcd:e${BEL}`,
      );
    });
  });
});
