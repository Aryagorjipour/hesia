"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { db } from "@/lib/db/schema";
import { useBoardStore } from "@/stores/board-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TagChip } from "@/components/ui/tag-chip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { COLUMN_LABELS, DEFAULT_COLUMNS } from "@/types/task";
import { cn } from "@/lib/utils/cn";

interface BoardFiltersProps {
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

function TagRow() {
  const tags = useLiveQuery(() => db.tags.toArray()) ?? [];
  const { selectedTags, toggleTag } = useBoardStore();

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <TagChip
          key={tag.name}
          name={tag.name}
          colorHex={tag.colorHex}
          selected={selectedTags.includes(tag.name)}
          onClick={() => toggleTag(tag.name)}
          className={cn(
            selectedTags.includes(tag.name) && "ring-1 ring-accent/40",
          )}
        />
      ))}
    </div>
  );
}

function FilterFields({ viewMode }: { viewMode: "board" | "list" }) {
  const categories = useLiveQuery(() => db.categories.toArray()) ?? [];

  const {
    selectedCategory,
    plannedFilter,
    statusFilter,
    dateFrom,
    dateTo,
    setSelectedCategory,
    setPlannedFilter,
    setStatusFilter,
    setDateFrom,
    setDateTo,
  } = useBoardStore();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Type</label>
          <Select
            value={plannedFilter}
            onValueChange={(v) =>
              setPlannedFilter(v as "all" | "planned" | "unplanned")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="unplanned">Flow wins</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Category</label>
          <Select
            value={selectedCategory ?? "all"}
            onValueChange={(v) =>
              setSelectedCategory(v === "all" ? null : v)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {viewMode === "list" && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as typeof statusFilter)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {DEFAULT_COLUMNS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {COLUMN_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">From</label>
          <Input
            type="date"
            value={dateFrom ?? ""}
            onChange={(e) => setDateFrom(e.target.value || null)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">To</label>
          <Input
            type="date"
            value={dateTo ?? ""}
            onChange={(e) => setDateTo(e.target.value || null)}
          />
        </div>
      </div>

    </div>
  );
}

export function BoardFilters({ searchInputRef }: BoardFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const {
    viewMode,
    searchQuery,
    setSearchQuery,
    clearFilters,
    hasActiveFilters,
  } = useBoardStore();

  const activeFilters = hasActiveFilters();

  return (
    <div className="space-y-2 border-b border-border px-3 py-2 sm:px-4 sm:py-3 lg:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button
          variant={activeFilters ? "secondary" : "ghost"}
          size="icon"
          onClick={() => setSheetOpen(true)}
          className="relative h-11 w-11 shrink-0 rounded-xl lg:hidden"
          aria-label="Open filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilters && (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
          )}
        </Button>

        <Button
          variant={filtersOpen || activeFilters ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="hidden h-11 gap-2 lg:flex"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilters && (
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          )}
        </Button>

        {activeFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearFilters}
            className="h-11 w-11 shrink-0 rounded-xl"
            aria-label="Clear filters"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {filtersOpen && (
        <div className="hidden rounded-2xl bg-muted/20 p-4 lg:block">
          <FilterFields viewMode={viewMode} />
        </div>
      )}

      <TagRow />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="max-h-[85vh]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <FilterFields viewMode={viewMode} />
        </SheetContent>
      </Sheet>
    </div>
  );
}