"use client";

import { useState } from "react";

function detectModKeyLabel(): string {
  if (typeof window === "undefined") return "Ctrl";
  const isMac =
    /Mac|iPhone|iPad|iPod/.test(navigator.platform) ||
    navigator.userAgent.includes("Mac");
  return isMac ? "⌘" : "Ctrl";
}

export function useModKeyLabel(): string {
  const [label] = useState(detectModKeyLabel);
  return label;
}