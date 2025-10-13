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
  
  push(c: Change<T>) { 
    this.s.push(c); 
    // Begrens stack størrelse til 50 items
    if (this.s.length > 50) {
      this.s.shift();
    }
  }
  
  pop(): Change<T> | undefined { 
    return this.s.pop(); 
  }
  
  get length() { 
    return this.s.length; 
  }

  clear() {
    this.s = [];
  }
}

class UndoManager {
  private stacks = new Map<UndoScope, Stack<any>>();
  private listeners = new Map<UndoScope, Set<() => void>>();

  private getStack(scope: UndoScope) {
    if (!this.stacks.has(scope)) {
      this.stacks.set(scope, new Stack());
    }
    return this.stacks.get(scope)!;
  }

  push<T>(scope: UndoScope, change: Change<T>) {
    this.getStack(scope).push(change);
    this.notifyListeners(scope);
  }

  canUndo(scope: UndoScope): boolean {
    return this.getStack(scope).length > 0;
  }

  getUndoCount(scope: UndoScope): number {
    return this.getStack(scope).length;
  }

  undo(scope: UndoScope): boolean {
    const c = this.getStack(scope).pop();
    if (!c) return false;
    
    // Reverter siste endring
    c.revert(c.prev);
    this.notifyListeners(scope);
    return true;
  }

  clear(scope: UndoScope) {
    this.getStack(scope).clear();
    this.notifyListeners(scope);
  }

  // Event system for å notifisere hooks om endringer
  subscribe(scope: UndoScope, listener: () => void) {
    if (!this.listeners.has(scope)) {
      this.listeners.set(scope, new Set());
    }
    this.listeners.get(scope)!.add(listener);

    return () => {
      this.listeners.get(scope)?.delete(listener);
    };
  }

  private notifyListeners(scope: UndoScope) {
    const scopeListeners = this.listeners.get(scope);
    if (scopeListeners) {
      scopeListeners.forEach(listener => listener());
    }
  }
}

export const undoManager = new UndoManager();

/**
 * Hjelper for å registrere en endring rundt en mutasjon
 */
export function withUndo<T>(
  scope: UndoScope,
  getCurrent: () => T,
  setter: (v: T) => void,
  computeNext: (curr: T) => T
) {
  const prev = getCurrent();
  const next = computeNext(prev);
  
  // Dyp kloning for Set og andre objekter
  const clonePrev = (prev instanceof Set ? new Set(prev) : structuredClone(prev)) as T;
  const cloneNext = (next instanceof Set ? new Set(next) : structuredClone(next)) as T;
  
  undoManager.push(scope, {
    prev: clonePrev,
    next: cloneNext,
    apply: () => setter(cloneNext),
    revert: () => setter(clonePrev),
    stamp: Date.now(),
  });
  
  setter(next);
}
