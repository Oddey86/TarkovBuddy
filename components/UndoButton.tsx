// components/UndoButton.tsx
"use client";

import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getQuestUndoCount,
  undoLastQuestChange,
  subscribeToQuestState,
} from "@/lib/questState";

export function UndoButton({ scope }: { scope: "quest" }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(getQuestUndoCount());
    update();
    // Re-render når quest-state endrer seg (etter toggles/undo)
    const unsub = subscribeToQuestState(() => update());
    // Få med deg lagring gjort i andre faner:
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === "tt_kappa_undo_v3" || e.key === "tt_kappa_tasks_v3") update();
    };
    window.addEventListener("storage", onStorage);
    return () => { unsub(); window.removeEventListener("storage", onStorage); };
  }, []);

  return (
    <Button
      onClick={async () => {
        const ok = await undoLastQuestChange();
        if (!ok) return;
        setCount(getQuestUndoCount());
      }}
      disabled={count === 0}
      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 text-sm rounded-md"
      title="Undo (reverter siste endring)"
    >
      <RotateCcw className="mr-2 h-4 w-4" />
      Undo
    </Button>
  );
}
