import type { ReactNode } from "react";
import { Menu, MonitorDown } from "lucide-react";
import { APP_META } from "@/lib/app/meta";
import {
  getInstallBlockMessage,
  type InstallBlockReason,
} from "@/lib/utils/install-eligibility";

export function InstallBlockNotice({ reason }: { reason: InstallBlockReason }) {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      {getInstallBlockMessage(reason, APP_META.siteUrl)}{" "}
      <a
        href={APP_META.siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-accent hover:text-accent/80"
      >
        Open live app
      </a>
    </p>
  );
}

export function FirefoxDesktopSteps() {
  return (
    <ol className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
      <li className="flex items-start gap-2">
        <StepNumber n={1} />
        <span>
          Look for the <MonitorDown className="inline h-3 w-3" /> install icon at
          the <strong className="font-medium text-foreground">far right of the address bar</strong>{" "}
          (beside the bookmark star).
        </span>
      </li>
      <li className="flex items-start gap-2">
        <StepNumber n={2} />
        <span>
          If it is not there, open the{" "}
          <strong className="font-medium text-foreground">main Firefox menu</strong>{" "}
          (<Menu className="inline h-3 w-3" /> hamburger,{" "}
          <strong className="font-medium text-foreground">top-right of the browser window</strong>
          ) — not the site panel next to the address bar — and choose{" "}
          <strong className="font-medium text-foreground">Install Hesia</strong>.
        </span>
      </li>
      <li className="flex items-start gap-2">
        <StepNumber n={3} />
        <span>Hesia opens in its own window like a native desktop app.</span>
      </li>
    </ol>
  );
}

export function FirefoxDesktopPromptText() {
  return (
    <>
      Look for the <MonitorDown className="inline h-3 w-3" /> install icon at the
      far right of the address bar. If it is missing, open the main Firefox menu (
      <Menu className="inline h-3 w-3" /> top-right of the{" "}
      <strong className="font-medium text-foreground">browser window</strong>, not
      the site panel) and choose{" "}
      <strong className="font-medium text-foreground">Install Hesia</strong>.
    </>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
      {n}
    </span>
  );
}

export function StepList({ steps }: { steps: ReactNode[] }) {
  return (
    <ol className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
      {steps.map((step, index) => (
        <li key={index} className="flex items-start gap-2">
          <StepNumber n={index + 1} />
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}