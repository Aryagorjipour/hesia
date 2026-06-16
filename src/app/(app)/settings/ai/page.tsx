import { AiConfigForm } from "@/features/settings/ai-config-form";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";

export default function AiSettingsPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
      <SettingsPageHeader
        title="AI Configuration"
        description="Bring your own API key — Grok, Ollama, OpenRouter, and more."
      />
      <AiConfigForm />
    </div>
  );
}