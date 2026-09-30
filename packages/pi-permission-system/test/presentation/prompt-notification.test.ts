import { describe, expect, it } from "vitest";
import {
  type PromptNotice,
  renderPromptNotification,
} from "#src/presentation/prompt-notification";

const BEL = "\x07";
const ESC = "\x1b";

const NOTICE: PromptNotice = { title: "pi", body: "Permission Required" };

describe("renderPromptNotification", () => {
  describe("each channel", () => {
    it("writes a bare BEL for bell", () => {
      expect(renderPromptNotification(["bell"], NOTICE)).toBe(BEL);
    });

    it("writes an OSC 9 notification for osc9", () => {
      expect(renderPromptNotification(["osc9"], NOTICE)).toBe(
        `${ESC}]9;Permission Required${BEL}`,
      );
    });

    it("writes the notice's title and body into OSC 777's two fields", () => {
      expect(
        renderPromptNotification(["osc777"], {
          title: "the title",
          body: "the body",
        }),
      ).toBe(`${ESC}]777;notify;the title;the body${BEL}`);
    });
  });

  describe("channel lists", () => {
    it("concatenates the channels in configured order", () => {
      expect(renderPromptNotification(["osc777", "bell"], NOTICE)).toBe(
        `${ESC}]777;notify;pi;Permission Required${BEL}${BEL}`,
      );
    });

    it("renders nothing for an empty list", () => {
      expect(renderPromptNotification([], NOTICE)).toBe("");
    });
  });

  describe("field sanitizing", () => {
    // A control character in a field could terminate the sequence early or
    // start a new one, so none survives into any OSC field.
    const hostile = `a${BEL}b${ESC}c\x7fd;e`;

    it("drops control characters and keeps semicolons in osc9", () => {
      expect(
        renderPromptNotification(["osc9"], { title: "pi", body: hostile }),
      ).toBe(`${ESC}]9;abcd;e${BEL}`);
    });

    it("drops control characters and turns semicolons into colons in the osc777 body", () => {
      // A semicolon separates the OSC 777 fields, so one in the body would
      // split it.
      expect(
        renderPromptNotification(["osc777"], { title: "pi", body: hostile }),
      ).toBe(`${ESC}]777;notify;pi;abcd:e${BEL}`);
    });

    it("drops control characters and turns semicolons into colons in the osc777 title", () => {
      expect(
        renderPromptNotification(["osc777"], { title: hostile, body: "body" }),
      ).toBe(`${ESC}]777;notify;abcd:e;body${BEL}`);
    });
  });
});
