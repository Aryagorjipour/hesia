"use client";

import { useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { db } from "@/lib/db/schema";
import { createTag } from "@/lib/db/mutations/tags";
import { createCategory } from "@/lib/db/mutations/categories";
import { toast } from "@/lib/toast";
import { TagChip } from "@/components/ui/tag-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TagCategoryFieldsProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  disabled?: boolean;
  tagLabelExtra?: ReactNode;
  categoryLabelExtra?: ReactNode;
}

export function TagCategoryFields({
  selectedTags,
  onTagsChange,
  category,
  onCategoryChange,
  disabled = false,
  tagLabelExtra,
  categoryLabelExtra,
}: TagCategoryFieldsProps) {
  const tags = useLiveQuery(() => db.tags.toArray()) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray()) ?? [];

  const [newTagName, setNewTagName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingTag, setCreatingTag] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const knownTagNames = new Set(tags.map((t) => t.name));
  const orphanSelectedTags = selectedTags.filter((name) => !knownTagNames.has(name));

  function toggleTag(name: string) {
    if (disabled) return;
    onTagsChange(
      selectedTags.includes(name)
        ? selectedTags.filter((t) => t !== name)
        : [...selectedTags, name],
    );
  }

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name || disabled) return;

    setCreatingTag(true);
    try {
      await createTag(name);
      onTagsChange([...new Set([...selectedTags, name])]);
      setNewTagName("");
      toast.success({
        title: "Tag created",
        description: `"${name}" is ready to use.`,
      });
    } catch (err) {
      toast.error({
        title: "Could not create tag",
        description: err instanceof Error ? err.message : "Create failed",
      });
    } finally {
      setCreatingTag(false);
    }
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name || disabled) return;

    setCreatingCategory(true);
    try {
      await createCategory(name);
      onCategoryChange(name);
      setNewCategoryName("");
      toast.success({
        title: "Category created",
        description: `"${name}" is ready to assign.`,
      });
    } catch (err) {
      toast.error({
        title: "Could not create category",
        description: err instanceof Error ? err.message : "Create failed",
      });
    } finally {
      setCreatingCategory(false);
    }
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Tags</Label>
          {tagLabelExtra}
        </div>
        {(tags.length > 0 || orphanSelectedTags.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {orphanSelectedTags.map((name) => (
              <TagChip
                key={`orphan-${name}`}
                name={name}
                selected={selectedTags.includes(name)}
                onClick={() => toggleTag(name)}
              />
            ))}
            {tags.map((tag) => (
              <TagChip
                key={tag.name}
                name={tag.name}
                colorHex={tag.colorHex}
                selected={selectedTags.includes(tag.name)}
                onClick={() => toggleTag(tag.name)}
              />
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Create a new tag"
            className="h-8 text-sm"
            disabled={disabled || creatingTag}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreateTag();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0 gap-1"
            onClick={() => void handleCreateTag()}
            disabled={disabled || creatingTag || !newTagName.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
        {tags.length === 0 && selectedTags.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No tags yet — create one above or pick from Settings → Tags.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Category</Label>
          {categoryLabelExtra}
        </div>
        <Select
          value={category || "none"}
          onValueChange={(v) => onCategoryChange(v === "none" ? "" : v)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Or create a new category"
            className="h-8 text-sm"
            disabled={disabled || creatingCategory}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreateCategory();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0 gap-1"
            onClick={() => void handleCreateCategory()}
            disabled={disabled || creatingCategory || !newCategoryName.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>
    </>
  );
}