"use client";

import { BarChart3, Calendar, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

const QUICK_PROMPTS = [
  {
    icon: BarChart3,
    label: "How's my week?",
    prompt: "How's my week going? Use my real stats and be specific.",
  },
  {
    icon: Sparkles,
    label: "Spot a pattern",
    prompt: "What patterns do you notice in my planned vs flow wins lately?",
  },
  {
    icon: Calendar,
    label: "Plan tomorrow",
    prompt: "Help me plan tomorrow — suggest 2–3 realistic To Do items based on my rhythm.",
  },
  {
    icon: Target,
    label: "Log a win",
    prompt:
      "I want to log a win from today. Ask me one short question, then draft a [TASK DRAFT] for my board.",
  },
] as const;

interface QuickActionsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function QuickActions({ onSelect, disabled }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
        <Button
          key={label}
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          className="h-8 gap-1.5 rounded-xl text-xs"
          onClick={() => onSelect(prompt)}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Button>
      ))}
    </div>
  );
}