"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils/cn";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "text-sm leading-relaxed text-foreground [&_a]:text-accent [&_a]:underline-offset-2 hover:[&_a]:underline",
        "[&_code]:rounded-md [&_code]:bg-muted/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs",
        "[&_h1]:my-2 [&_h1]:text-base [&_h1]:font-medium",
        "[&_h2]:my-2 [&_h2]:text-sm [&_h2]:font-medium",
        "[&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-4",
        "[&_p]:my-1.5 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted/30 [&_pre]:p-3 [&_pre]:text-xs",
        "[&_strong]:font-medium [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}