import { cn } from "@/lib/utils/cn";

interface TagChipProps {
  name: string;
  colorHex?: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function TagChip({
  name,
  colorHex = "#71717a",
  selected,
  onClick,
  className,
}: TagChipProps) {
  const Comp = onClick ? "button" : "span";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        onClick && "cursor-pointer hover:opacity-80",
        selected
          ? "bg-accent/20 text-accent ring-1 ring-accent/40"
          : "bg-muted/50 text-muted-foreground",
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: colorHex }}
      />
      {name}
    </Comp>
  );
}