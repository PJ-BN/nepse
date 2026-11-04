import { describe, expect, it } from "vitest";
import {
  parseNavbarVisible,
  shouldToggleNavbarShortcut,
  NAVBAR_STORAGE_KEY,
} from "./NavbarContext";

describe("NavbarContext helpers", () => {
  describe("parseNavbarVisible", () => {
    it("returns defaultValue when string is null or undefined", () => {
      expect(parseNavbarVisible(null, true)).toBe(true);
      expect(parseNavbarVisible(null, false)).toBe(false);
      expect(parseNavbarVisible(undefined, true)).toBe(true);
      expect(parseNavbarVisible(undefined, false)).toBe(false);
      expect(parseNavbarVisible(null)).toBe(true); // default true
    });

    it("parses 'true' as true and 'false' as false", () => {
      expect(parseNavbarVisible("true")).toBe(true);
      expect(parseNavbarVisible("false")).toBe(false);
      expect(parseNavbarVisible("anything_else")).toBe(false);
    });
  });

  describe("shouldToggleNavbarShortcut", () => {
    it("recognizes Ctrl+B and Ctrl+b", () => {
      expect(
        shouldToggleNavbarShortcut({
          key: "b",
          ctrlKey: true,
        })
      ).toBe(true);

      expect(
        shouldToggleNavbarShortcut({
          key: "B",
          ctrlKey: true,
        })
      ).toBe(true);
    });

    it("recognizes Cmd+B / MetaKey on macOS", () => {
      expect(
        shouldToggleNavbarShortcut({
          key: "b",
          metaKey: true,
        })
      ).toBe(true);

      expect(
        shouldToggleNavbarShortcut({
          key: "B",
          metaKey: true,
        })
      ).toBe(true);
    });

    it("does not trigger when Ctrl or Meta is missing", () => {
      expect(
        shouldToggleNavbarShortcut({
          key: "b",
          ctrlKey: false,
          metaKey: false,
        })
      ).toBe(false);
    });

    it("does not trigger for other keys", () => {
      expect(
        shouldToggleNavbarShortcut({
          key: "c",
          ctrlKey: true,
        })
      ).toBe(false);

      expect(
        shouldToggleNavbarShortcut({
          key: "a",
          metaKey: true,
        })
      ).toBe(false);
    });

    it("prevents hijacking shortcut when focused in input, textarea, or contentEditable", () => {
      expect(
        shouldToggleNavbarShortcut({
          key: "b",
          ctrlKey: true,
          targetTagName: "INPUT",
        })
      ).toBe(false);

      expect(
        shouldToggleNavbarShortcut({
          key: "b",
          ctrlKey: true,
          targetTagName: "TEXTAREA",
        })
      ).toBe(false);

      expect(
        shouldToggleNavbarShortcut({
          key: "b",
          metaKey: true,
          isContentEditable: true,
        })
      ).toBe(false);
    });
  });

  describe("NAVBAR_STORAGE_KEY", () => {
    it("uses a dedicated, consistent localStorage key", () => {
      expect(NAVBAR_STORAGE_KEY).toBe("nepse_navbar_visible");
    });
  });
});
