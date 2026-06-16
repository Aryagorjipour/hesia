"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { carryAllIncompleteToNextDay } from "@/lib/db/mutations/tasks";
import { formatBoardDayLabel, nextBoardDate } from "@/lib/utils/board-dates";
import { Button } from "@/components/ui/button";

interface RollOverBarProps {
  boardDate: string;
  count: number;
}

export function RollOverBar({ boardDate, count }: RollOverBarProps) {
  const [loading, setLoading] = useState(false);

  if (count === 0) return null;

  async function handleRollOver() {
    setLoading(true);
    try {
      await carryAllIncompleteToNextDay(boardDate);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-card/30 px-3 py-2 sm:px-4 lg:px-6">
      <p className="min-w-0 text-[11px] text-muted-foreground">
        {count} incomplete on {formatBoardDayLabel(boardDate)} — move to{" "}
        {formatBoardDayLabel(nextBoardDate(boardDate))}?
      </p>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => void handleRollOver()}
        disabled={loading}
        className="h-7 shrink-0 gap-1 px-2.5 text-xs"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        {loading ? "Moving…" : "Carry forward"}
      </Button>
    </div>
  );
}