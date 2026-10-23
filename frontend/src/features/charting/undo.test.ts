import { describe, expect, it } from "vitest";
import { History } from "./undo";

describe("History", () => {
  it("undoes and redoes, and a new change clears redo", () => {
    const h = new History<number[]>([]);
    h.push([1]);
    h.push([1, 2]);
    expect(h.undo()).toEqual([1]);
    expect(h.undo()).toEqual([]);
    expect(h.undo()).toBeUndefined();
    expect(h.redo()).toEqual([1]);
    h.push([9]);
    expect(h.canRedo).toBe(false);
    expect(h.undo()).toEqual([1]);
  });
  it("ignores no-op pushes and caps the stack", () => {
    const h = new History<number>(0, undefined, 2);
    expect(h.push(0)).toBe(false);
    [1, 2, 3].forEach((n) => h.push(n));
    expect(h.undo()).toBe(2);
    expect(h.undo()).toBe(1);
    expect(h.undo()).toBeUndefined();
  });
  it("reset drops history", () => {
    const h = new History(0);
    h.push(1);
    h.reset(5);
    expect(h.canUndo || h.canRedo).toBe(false);
  });
});
