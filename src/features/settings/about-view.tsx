"use client";

import { HesiaLogo } from "@/components/brand/hesia-logo";
import { APP_META, getCopyrightNotice } from "@/lib/app/meta";

export function AboutView() {
  return (
    <div className="space-y-6 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="rounded-2xl border border-border bg-card/50 p-5 text-center sm:p-6">
        <div className="mx-auto mb-4 flex justify-center">
          <HesiaLogo variant="horizontal" className="h-14 sm:h-16" priority />
        </div>
        <p className="text-lg font-medium text-foreground">{APP_META.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">v{APP_META.version}</p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {APP_META.tagline}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
        <h2 className="text-sm font-medium text-foreground">Live app</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Open Hesia in your browser or install it to your desktop or phone from
          the live URL.
        </p>
        <a
          href={APP_META.siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-medium text-accent transition-colors hover:text-accent/80"
        >
          {APP_META.siteUrl}
        </a>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
        <h2 className="text-sm font-medium text-foreground">About</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {APP_META.description}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
        <h2 className="text-sm font-medium text-foreground">Developer</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="text-right font-medium text-foreground">
              {APP_META.developer.name}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="text-right text-foreground">
              {APP_META.developer.role}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">GitHub</dt>
            <dd className="text-right">
              <a
                href={APP_META.developer.github}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-accent transition-colors hover:text-accent/80"
              >
                @{APP_META.developer.githubHandle}
              </a>
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
        <h2 className="text-sm font-medium text-foreground">Built with</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {APP_META.stack.join(" · ")}
        </p>
      </div>

      <p className="px-1 text-center text-[11px] text-muted-foreground/80">
        {getCopyrightNotice()}
      </p>
    </div>
  );
}