/** Snapshot history: each recorded state is one undo step. `eq` stops no-op changes from creating steps. */
export class History<T> {
  private past: T[] = [];
  private future: T[] = [];

  constructor(
    private present: T,
    private eq: (a: T, b: T) => boolean = (a, b) => JSON.stringify(a) === JSON.stringify(b),
    private limit = 100,
  ) {}

  get canUndo() {
    return this.past.length > 0;
  }
  get canRedo() {
    return this.future.length > 0;
  }

  /** Record a new state; returns false if it equals the current one. */
  push(next: T): boolean {
    if (this.eq(this.present, next)) return false;
    this.past.push(this.present);
    if (this.past.length > this.limit) this.past.shift();
    this.present = next;
    this.future = [];
    return true;
  }

  /** The state to restore, or undefined when there is nothing to undo. */
  undo(): T | undefined {
    if (!this.past.length) return undefined;
    this.future.push(this.present);
    this.present = this.past.pop()!;
    return this.present;
  }

  redo(): T | undefined {
    if (!this.future.length) return undefined;
    this.past.push(this.present);
    this.present = this.future.pop()!;
    return this.present;
  }

  /** Start over from `state` (e.g. a different symbol or timeframe was loaded). */
  reset(state: T) {
    this.past = [];
    this.future = [];
    this.present = state;
  }
}
