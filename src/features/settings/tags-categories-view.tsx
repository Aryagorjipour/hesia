"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { FolderOpen, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { db } from "@/lib/db/schema";
import {
  createTag,
  updateTag,
  renameTag,
  deleteTag,
} from "@/lib/db/mutations/tags";
import {
  createCategory,
  updateCategory,
  renameCategory,
  deleteCategory,
} from "@/lib/db/mutations/categories";
import { confirm } from "@/lib/confirm";
import { toast } from "@/lib/toast";
import { TagChip } from "@/components/ui/tag-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/ui/color-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TagsCategoriesView() {
  const tags = useLiveQuery(() => db.tags.toArray()) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray()) ?? [];

  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#10b981");

  const [editTag, setEditTag] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagColor, setEditTagColor] = useState("#6366f1");

  const [editCat, setEditCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatColor, setEditCatColor] = useState("#10b981");

  const [busy, setBusy] = useState(false);

  async function handleAddTag() {
    const name = newTagName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await createTag(name, newTagColor);
      setNewTagName("");
      toast.success({
        title: "Tag added",
        description: `"${name}" is ready to use on tasks.`,
      });
    } catch (e) {
      toast.error({
        title: "Could not add tag",
        description: e instanceof Error ? e.message : "Failed to add tag",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleAddCategory() {
    const name = newCatName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await createCategory(name, newCatColor);
      setNewCatName("");
      toast.success({
        title: "Category added",
        description: `"${name}" is ready to assign on tasks.`,
      });
    } catch (e) {
      toast.error({
        title: "Could not add category",
        description: e instanceof Error ? e.message : "Failed to add category",
      });
    } finally {
      setBusy(false);
    }
  }

  function openEditTag(name: string, color: string) {
    setEditTag(name);
    setEditTagName(name);
    setEditTagColor(color);
  }

  function openEditCategory(name: string, color?: string) {
    setEditCat(name);
    setEditCatName(name);
    setEditCatColor(color ?? "#10b981");
  }

  async function handleSaveTag() {
    if (!editTag) return;
    const finalName = editTagName.trim();
    if (!finalName) return;
    setBusy(true);
    try {
      if (finalName !== editTag) {
        await renameTag(editTag, finalName);
      }
      await updateTag(finalName, { colorHex: editTagColor });
      setEditTag(null);
      toast.success({
        title: "Tag updated",
        description: `"${finalName}" has been saved.`,
      });
    } catch (e) {
      toast.error({
        title: "Could not save tag",
        description: e instanceof Error ? e.message : "Failed to save tag",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveCategory() {
    if (!editCat) return;
    const finalName = editCatName.trim();
    if (!finalName) return;
    setBusy(true);
    try {
      if (finalName !== editCat) {
        await renameCategory(editCat, finalName);
      }
      await updateCategory(finalName, { colorHex: editCatColor });
      setEditCat(null);
      toast.success({
        title: "Category updated",
        description: `"${finalName}" has been saved.`,
      });
    } catch (e) {
      toast.error({
        title: "Could not save category",
        description:
          e instanceof Error ? e.message : "Failed to save category",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteTag(name: string, count: number) {
    if (count > 0) {
      const taskLabel = count === 1 ? "1 task" : `${count} tasks`;
      const confirmed = await confirm({
        title: `Remove tag "${name}"?`,
        description: `This tag is on ${taskLabel}. It will be removed from those tasks and deleted permanently.`,
        confirmLabel: "Remove tag",
        cancelLabel: "Keep tag",
        destructive: true,
      });
      if (!confirmed) return;
    }

    setBusy(true);
    try {
      await deleteTag(name);
      toast.success({
        title: "Tag deleted",
        description:
          count > 0
            ? `"${name}" was removed from your tasks.`
            : `"${name}" has been deleted.`,
      });
    } catch (e) {
      toast.error({
        title: "Could not delete tag",
        description: e instanceof Error ? e.message : "Failed to delete tag",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteCategory(name: string, count: number) {
    if (count > 0) {
      const taskLabel = count === 1 ? "1 task" : `${count} tasks`;
      const confirmed = await confirm({
        title: `Remove category "${name}"?`,
        description: `This category is assigned to ${taskLabel}. It will be cleared from those tasks and deleted permanently.`,
        confirmLabel: "Remove category",
        cancelLabel: "Keep category",
        destructive: true,
      });
      if (!confirmed) return;
    }

    setBusy(true);
    try {
      await deleteCategory(name);
      toast.success({
        title: "Category deleted",
        description:
          count > 0
            ? `"${name}" was cleared from your tasks.`
            : `"${name}" has been deleted.`,
      });
    } catch (e) {
      toast.error({
        title: "Could not delete category",
        description:
          e instanceof Error ? e.message : "Failed to delete category",
      });
    } finally {
      setBusy(false);
    }
  }

  const sortedTags = [...tags].sort((a, b) => b.usageCount - a.usageCount);
  const sortedCategories = [...categories].sort(
    (a, b) => b.usageCount - a.usageCount,
  );

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <Tabs defaultValue="tags">
        <TabsList className="grid h-11 w-full grid-cols-2 rounded-2xl bg-muted/30 p-1">
          <TabsTrigger value="tags" className="rounded-xl">
            Tags ({tags.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-xl">
            Categories ({categories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tags" className="mt-5 space-y-5">
          <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <p className="mb-3 text-xs text-muted-foreground">
              Tags label tasks across your board and reports.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor="new-tag">New tag</Label>
                <Input
                  id="new-tag"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g. deep-work"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleAddTag();
                  }}
                />
              </div>
              <ColorPicker
                compact
                value={newTagColor}
                onChange={setNewTagColor}
                disabled={busy}
                aria-label="Tag color"
              />
              <Button
                type="button"
                size="sm"
                className="gap-1.5 sm:h-11"
                onClick={() => void handleAddTag()}
                disabled={busy || !newTagName.trim()}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add
              </Button>
            </div>
          </div>

          {tags.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No tags yet"
              description="Tags appear when you add them to tasks, or create one above to get started."
              className="py-12"
            />
          ) : (
            <ul className="space-y-2" aria-label="Tags list">
              {sortedTags.map((tag) => (
                <li
                  key={tag.name}
                  className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/30 px-4 py-3"
                >
                  <TagChip
                    name={tag.name}
                    colorHex={tag.colorHex}
                    className="min-w-0 max-w-[45%] truncate"
                  />
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {tag.usageCount} uses
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Edit tag ${tag.name}`}
                      disabled={busy}
                      onClick={() => openEditTag(tag.name, tag.colorHex)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-400"
                      aria-label={`Delete tag ${tag.name}`}
                      disabled={busy}
                      onClick={() =>
                        void handleDeleteTag(tag.name, tag.usageCount)
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-5 space-y-5">
          <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <p className="mb-3 text-xs text-muted-foreground">
              Categories group related work — one per task.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor="new-cat">New category</Label>
                <Input
                  id="new-cat"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Deep Work"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleAddCategory();
                  }}
                />
              </div>
              <ColorPicker
                compact
                value={newCatColor}
                onChange={setNewCatColor}
                disabled={busy}
                aria-label="Category color"
              />
              <Button
                type="button"
                size="sm"
                className="gap-1.5 sm:h-11"
                onClick={() => void handleAddCategory()}
                disabled={busy || !newCatName.trim()}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add
              </Button>
            </div>
          </div>

          {categories.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No categories yet"
              description="Assign categories on tasks to organize your board and reports."
              className="py-12"
            />
          ) : (
            <ul className="space-y-2" aria-label="Categories list">
              {sortedCategories.map((cat) => (
                <li
                  key={cat.name}
                  className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/30 px-4 py-3"
                >
                  <div className="flex min-w-0 max-w-[45%] items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: cat.colorHex ?? "#71717a",
                      }}
                      aria-hidden
                    />
                    <span className="truncate text-sm font-medium">
                      {cat.name}
                    </span>
                  </div>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {cat.usageCount} uses
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Edit category ${cat.name}`}
                      disabled={busy}
                      onClick={() =>
                        openEditCategory(cat.name, cat.colorHex)
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-400"
                      aria-label={`Delete category ${cat.name}`}
                      disabled={busy}
                      onClick={() =>
                        void handleDeleteCategory(cat.name, cat.usageCount)
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={editTag !== null}
        onOpenChange={(o) => !o && setEditTag(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-tag-name">Name</Label>
              <Input
                id="edit-tag-name"
                value={editTagName}
                onChange={(e) => setEditTagName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Accent</Label>
              <ColorPicker
                value={editTagColor}
                onChange={setEditTagColor}
                disabled={busy}
                className="w-full justify-start"
                aria-label="Tag accent color"
              />
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => void handleSaveTag()}
              disabled={busy || !editTagName.trim()}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editCat !== null}
        onOpenChange={(o) => !o && setEditCat(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cat-name">Name</Label>
              <Input
                id="edit-cat-name"
                value={editCatName}
                onChange={(e) => setEditCatName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Accent</Label>
              <ColorPicker
                value={editCatColor}
                onChange={setEditCatColor}
                disabled={busy}
                className="w-full justify-start"
                aria-label="Category accent color"
              />
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => void handleSaveCategory()}
              disabled={busy || !editCatName.trim()}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}