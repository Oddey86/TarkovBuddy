// hooks/useUndo.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { undoManager, withUndo } from '@/lib/undo';
import type { UndoScope } from '@/lib/undo';

/**
 * Hook som gir tilgang til undo-funksjonalitet for et gitt scope
 */
export function useUndo(scope: UndoScope) {
  const [canUndo, setCanUndo] = useState(false);

  // Oppdater canUndo når komponenten mountes og når undo-stacken endres
  useEffect(() => {
    const updateCanUndo = () => {
      setCanUndo(undoManager.canUndo(scope));
    };

    // Initial check
    updateCanUndo();

    // Subscribe til endringer i undo-stacken
    const unsubscribe = undoManager.subscribe(scope, updateCanUndo);

    return () => unsubscribe();
  }, [scope]);

  const undo = useCallback(() => {
    const success = undoManager.undo(scope);
    setCanUndo(undoManager.canUndo(scope));
    return success;
  }, [scope]);

  /**
   * Wrapper-funksjon som registrerer en endring og utfører den
   * @param getCurrent - Funksjon som returnerer nåværende state
   * @param setter - Funksjon som setter ny state
   * @param computeNext - Funksjon som beregner neste state basert på nåværende
   */
  const wrapChange = useCallback(
    <T,>(
      getCurrent: () => T,
      setter: (v: T) => void,
      computeNext: (curr: T) => T
    ) => {
      withUndo(scope, getCurrent, setter, computeNext);
      setCanUndo(undoManager.canUndo(scope));
    },
    [scope]
  );

  return {
    canUndo,
    undo,
    wrapChange,
  };
}
