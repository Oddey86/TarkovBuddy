// hooks/useUndo.ts
"use client";
import { useSyncExternalStore, useCallback, useState, useEffect } from "react";
import { undoManager, UndoScope } from "@/lib/undo";

// Enkel pub/sub for "kan jeg angre?" – lokalt i komponent.
const subs = new Set<() => void>();
function subscribe(cb: () => void) { subs.add(cb); return () => subs.delete(cb); }
function emit() { subs.forEach(fn => fn()); }

export function useUndo(scope: UndoScope) {
  // Re-render når noen pusher/undoer i samme scope:
  const canUndo = useSyncExternalStore(
    subscribe,
    () => undoManager.canUndo(scope),
    () => false
  );

  const undo = useCallback(() => {
    const ok = undoManager.undo(scope);
    if (ok) emit();
    return ok;
  }, [scope]);

  // Tastatursnarvei Ctrl+Z
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  // Hjelper for å wrappe en state-endring og poste til Undo-stack:
  const wrapChange = useCallback(<T,>(
    getCurrent: () => T,
    setter: (v: T) => void,
    computeNext: (curr: T) => T
  ) => {
    const { withUndo } = require("@/lib/undo");
    withUndo(scope, getCurrent, (v: T) => { setter(v); emit(); }, computeNext);
  }, [scope]);

  return { canUndo, undo, wrapChange };
}
