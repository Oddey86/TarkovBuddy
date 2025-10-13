// components/UndoButton.tsx
"use client";
import { useUndo } from "@/hooks/useUndo";
import type { UndoScope } from "@/lib/undo";
import { Button } from "@/components/ui/button"; // shadcn
import { RotateCcw } from "lucide-react";

export function UndoButton({ scope, className }: { scope: UndoScope; className?: string }) {
  const { canUndo, undo } = useUndo(scope);
  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={() => undo()}
      disabled={!canUndo}
      title="Undo (Ctrl+Z)"
    >
      <RotateCcw className="mr-2 h-4 w-4" />
      Undo
    </Button>
  );
}
