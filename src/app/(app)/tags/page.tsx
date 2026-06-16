import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { TagsCategoriesView } from "@/features/settings/tags-categories-view";

export default function TagsPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
      <MobilePageHeader
        title="Tags & Categories"
        subtitle="Rename, color-code, and manage with live usage counts."
        className="px-4 sm:px-6 lg:px-8"
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <TagsCategoriesView />
      </div>
    </div>
  );
}