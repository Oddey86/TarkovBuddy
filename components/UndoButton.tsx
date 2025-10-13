// components/UndoButton.tsx
"use client";

import { useState, useEffect } from "react";
import { useUndo } from "@/hooks/useUndo";
import { undoManager } from "@/lib/undo";
import type { UndoScope } from "@/lib/undo";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export function UndoButton({ scope }: { scope: UndoScope }) {
  const { canUndo, undo } = useUndo(scope);
  const [undoCount, setUndoCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setUndoCount(undoManager.getUndoCount(scope));
    };

    // Initial count
    updateCount();

    // Subscribe til endringer
    const unsubscribe = undoManager.subscribe(scope, updateCount);

    return () => unsubscribe();
  }, [scope]);

  return (
    <Button
      variant="default"
      onClick={() => undo()}
      disabled={!canUndo}
      className="bg-[#6b73ff] hover:bg-[#5865ff] text-white px-4 py-2 text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <RotateCcw className="mr-2 h-4 w-4" />
      {undoCount > 0 ? `Undo (${undoCount})` : "Undo"}
    </Button>
  );
}
