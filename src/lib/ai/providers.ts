import type { AiProviderPreset } from "@/types/settings";

export interface ProviderPresetConfig {
  id: AiProviderPreset;
  name: string;
  baseUrl: string;
  defaultModel: string;
  tutorial: string[];
}

export const PROVIDER_PRESETS: Record<AiProviderPreset, ProviderPresetConfig> = {
  grok: {
    id: "grok",
    name: "Grok / xAI",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-3-mini",
    tutorial: [
      "Go to console.x.ai and sign in",
      "Create an API key under API Keys",
      "Base URL: https://api.x.ai/v1",
      "Paste your key below and test the connection",
    ],
  },
  ollama: {
    id: "ollama",
    name: "Ollama (local)",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    tutorial: [
      "Install Ollama from ollama.com",
      "Run: ollama pull llama3.2",
      "Ollama serves OpenAI-compatible API at localhost:11434/v1",
      "No API key needed — leave key empty",
    ],
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-sonnet-4",
    tutorial: [
      "Sign up at openrouter.ai",
      "Create an API key in Settings",
      "Pick any model (e.g. anthropic/claude-sonnet-4)",
      "Base URL: https://openrouter.ai/api/v1",
    ],
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    tutorial: [
      "Go to platform.openai.com/api-keys",
      "Create a new secret key",
      "Base URL: https://api.openai.com/v1",
    ],
  },
  groq: {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    tutorial: [
      "Sign up at console.groq.com",
      "Create an API key",
      "Base URL: https://api.groq.com/openai/v1",
    ],
  },
  custom: {
    id: "custom",
    name: "Custom",
    baseUrl: "",
    defaultModel: "",
    tutorial: [
      "Enter any OpenAI-compatible base URL",
      "Specify your model name",
      "Add API key if your provider requires it",
    ],
  },
};