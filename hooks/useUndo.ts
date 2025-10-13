// lib/undo.ts
export type UndoScope = "quest" | "questItems" | "hideout" | "optimizer";

type Change<T> = {
  prev: T;
  next: T;
  apply: (val: T) => void;      // setter verdien til next
  revert: (val: T) => void;     // setter verdien til prev
  stamp: number;                // Date.now()
};

class Stack<T> {
  private s: Change<T>[] = [];
  push(c: Change<T>) { this.s.push(c); }
  pop(): Change<T> | undefined { return this.s.pop(); }
  get length() { return this.s.length; }
}

class UndoManager {
  private stacks = new Map<UndoScope, Stack<any>>();

  private getStack(scope: UndoScope) {
    if (!this.stacks.has(scope)) this.stacks.set(scope, new Stack());
    return this.stacks.get(scope)!;
  }

  push<T>(scope: UndoScope, change: Change<T>) {
    this.getStack(scope).push(change);
  }

  canUndo(scope: UndoScope) {
    return this.getStack(scope).length > 0;
  }

  undo(scope: UndoScope) {
    const c = this.getStack(scope).pop();
    if (!c) return false;
    // Reverter siste endring
    c.revert(c.prev);
    return true;
  }
}

export const undoManager = new UndoManager();

// Hjelper for å registrere en endring rundt en mutasjon:
export function withUndo<T>(
  scope: UndoScope,
  getCurrent: () => T,
  setter: (v: T) => void,
  computeNext: (curr: T) => T
) {
  const prev = getCurrent();
  const next = computeNext(prev);
  undoManager.push(scope, {
    prev,
    next,
    apply: () => setter(next),
    revert: () => setter(prev),
    stamp: Date.now(),
  });
  setter(next);
}
