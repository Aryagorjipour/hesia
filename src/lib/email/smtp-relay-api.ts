import {
  SmtpConfigResponseSchema,
  type PublicSmtpConfig,
  type SmtpFormValues,
} from "@/types/smtp";
import { buildFromAddress } from "@/lib/email/smtp-presets";
import { platformInvoke } from "@/lib/platform/invoke";

async function relayJson<T>(
  relayUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = relayUrl.replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? `Relay request failed (${res.status})`,
    );
  }

  return data;
}

export async function fetchRelaySmtpConfig(
  relayUrl: string,
): Promise<{ configured: boolean; config: PublicSmtpConfig | null }> {
  const data = await platformInvoke<unknown>(
    "smtp_config_get",
    {},
    () => relayJson<unknown>(relayUrl, "/smtp/config"),
  );
  const parsed = SmtpConfigResponseSchema.safeParse(data);
  if (!parsed.success) {
    return { configured: false, config: null };
  }
  return {
    configured: parsed.data.configured,
    config: parsed.data.config,
  };
}

export async function saveRelaySmtpConfig(
  relayUrl: string,
  values: SmtpFormValues,
): Promise<{ configured: boolean; config: PublicSmtpConfig | null }> {
  const invokeArgs = {
    host: values.host.trim(),
    port: values.port,
    secure: values.secure,
    user: values.user.trim(),
    pass: values.pass,
    from: buildFromAddress(values.fromName, values.user),
  };
  const data = await platformInvoke<{
    ok: boolean;
    configured: boolean;
    config: PublicSmtpConfig | null;
  }>(
    "smtp_config_put",
    invokeArgs,
    () =>
      relayJson<{
        ok: boolean;
        configured: boolean;
        config: PublicSmtpConfig | null;
      }>(relayUrl, "/smtp/config", {
        method: "PUT",
        body: JSON.stringify(invokeArgs),
      }),
  );

  return {
    configured: data.configured,
    config: data.config,
  };
}

export async function testRelaySmtpConnection(
  relayUrl: string,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const data = await platformInvoke<{ ok: boolean; message?: string }>(
      "smtp_test",
      {},
      () =>
        relayJson<{ ok: boolean; message?: string }>(relayUrl, "/smtp/test", {
          method: "POST",
        }),
    );
    return { ok: data.ok, message: data.message };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "SMTP test failed",
    };
  }
}
