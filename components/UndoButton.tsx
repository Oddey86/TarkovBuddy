// components/UndoButton.tsx
"use client";
import { useUndo } from "@/hooks/useUndo";
import type { UndoScope } from "@/lib/undo";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export function UndoButton({ scope }: { scope: UndoScope }) {
  const { canUndo, undo } = useUndo(scope);

  return (
    <Button
      variant="default"
      onClick={() => undo()}
      disabled={!canUndo}
      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 text-sm rounded-md"
    >
      <RotateCcw className="mr-2 h-4 w-4" />
      Undo
    </Button>
  );
}
