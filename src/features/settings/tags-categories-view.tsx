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

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAddTag() {
    if (!newTagName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createTag(newTagName.trim(), newTagColor);
      setNewTagName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add tag");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createCategory(newCatName.trim(), newCatColor);
      setNewCatName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add category");
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
    setError(null);
    try {
      if (finalName !== editTag) {
        await renameTag(editTag, finalName);
      }
      await updateTag(finalName, { colorHex: editTagColor });
      setEditTag(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save tag");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveCategory() {
    if (!editCat) return;
    const finalName = editCatName.trim();
    if (!finalName) return;
    setBusy(true);
    setError(null);
    try {
      if (finalName !== editCat) {
        await renameCategory(editCat, finalName);
      }
      await updateCategory(finalName, { colorHex: editCatColor });
      setEditCat(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save category");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteTag(name: string, count: number) {
    const msg =
      count > 0
        ? `Remove "${name}" from ${count} tasks?`
        : `Delete tag "${name}"?`;
    if (!confirm(msg)) return;
    await deleteTag(name);
  }

  async function handleDeleteCategory(name: string, count: number) {
    const msg =
      count > 0
        ? `Clear category "${name}" from ${count} tasks?`
        : `Delete category "${name}"?`;
    if (!confirm(msg)) return;
    await deleteCategory(name);
  }

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
              {tags
                .sort((a, b) => b.usageCount - a.usageCount)
                .map((tag) => (
                  <li
                    key={tag.name}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card/30 px-4 py-3"
                  >
                    <TagChip name={tag.name} colorHex={tag.colorHex} />
                    <span className="text-xs text-muted-foreground">
                      {tag.usageCount} uses
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Edit tag ${tag.name}`}
                        onClick={() => openEditTag(tag.name, tag.colorHex)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-400"
                        aria-label={`Delete tag ${tag.name}`}
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
              {categories
                .sort((a, b) => b.usageCount - a.usageCount)
                .map((cat) => (
                  <li
                    key={cat.name}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card/30 px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: cat.colorHex ?? "#71717a",
                        }}
                        aria-hidden
                      />
                      <span className="text-sm font-medium">{cat.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {cat.usageCount} uses
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Edit category ${cat.name}`}
                        onClick={() =>
                          openEditCategory(cat.name, cat.colorHex)
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-400"
                        aria-label={`Delete category ${cat.name}`}
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

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400"
        >
          {error}
        </p>
      )}

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