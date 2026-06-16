import { AiConfigForm } from "@/features/settings/ai-config-form";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { SettingsScrollArea } from "@/components/settings/settings-scroll-area";

export default function AiSettingsPage() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
      <SettingsPageHeader
        title="AI Configuration"
        description="Bring your own API key — Grok, Ollama, OpenRouter, and more."
      />
      <SettingsScrollArea>
        <AiConfigForm />
      </SettingsScrollArea>
    </div>
  );
}