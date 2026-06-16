"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type AnimationPlaybackControls,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HesiaStarMark } from "./hesia-star-mark";

const RIVER_EASE = [0.22, 1, 0.36, 1] as const;
const TRAVEL_MS = 1550;
const SLOT_RETRY_LIMIT = 60;

type IntroPhase = "loading" | "travel" | "docked" | "revealed";

interface WelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
  introDone?: boolean;
  onIntroComplete?: () => void;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function WelcomeStep({
  onNext,
  onSkip,
  introDone = false,
  onIntroComplete,
}: WelcomeStepProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const onIntroCompleteRef = useRef(onIntroComplete);

  useEffect(() => {
    onIntroCompleteRef.current = onIntroComplete;
  });

  const skipIntro = prefersReducedMotion() || introDone;

  const [phase, setPhase] = useState<IntroPhase>(() =>
    skipIntro ? "revealed" : "loading",
  );

  const flyX = useMotionValue(0);
  const flyY = useMotionValue(0);
  const flyScale = useMotionValue(0.35);
  const flyRotate = useMotionValue(0);
  const flyOpacity = useMotionValue(0);
  const trailOpacity = useTransform(flyOpacity, [0, 1], [0, 0.55]);

  useEffect(() => {
    if (introDone) return;

    if (prefersReducedMotion()) {
      onIntroCompleteRef.current?.();
      return;
    }

    let cancelled = false;
    let stopAnimations: (() => void) | undefined;

    function finishIntro() {
      if (cancelled) return;
      setPhase("revealed");
      onIntroCompleteRef.current?.();
    }

    function startTravel(attempt = 0) {
      if (cancelled) return;

      const slot = slotRef.current;
      if (!slot) {
        if (attempt < SLOT_RETRY_LIMIT) {
          requestAnimationFrame(() => startTravel(attempt + 1));
          return;
        }
        finishIntro();
        return;
      }

      const rect = slot.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        if (attempt < SLOT_RETRY_LIMIT) {
          requestAnimationFrame(() => startTravel(attempt + 1));
          return;
        }
        finishIntro();
        return;
      }

      const startX = window.innerWidth / 2;
      const startY = window.innerHeight / 2;
      const endX = rect.left + rect.width / 2;
      const endY = rect.top + rect.height / 2;
      const midX = startX + (endX - startX) * 0.35 + 48;
      const midY = startY + (endY - startY) * 0.25 - 72;

      flyX.set(startX);
      flyY.set(startY);
      flyScale.set(0.35);
      flyRotate.set(-30);
      flyOpacity.set(0);
      setPhase("travel");

      const controls: AnimationPlaybackControls[] = [
        animate(flyOpacity, 1, { duration: 0.45, ease: "easeOut" }),
        animate(flyScale, [0.35, 1.35, 1], {
          duration: TRAVEL_MS / 1000,
          times: [0, 0.55, 1],
          ease: RIVER_EASE,
        }),
        animate(flyRotate, [0, 220, 540], {
          duration: TRAVEL_MS / 1000,
          times: [0, 0.4, 1],
          ease: RIVER_EASE,
        }),
        animate(flyX, [startX, midX, endX], {
          duration: TRAVEL_MS / 1000,
          times: [0, 0.42, 1],
          ease: RIVER_EASE,
        }),
        animate(flyY, [startY, midY, endY], {
          duration: TRAVEL_MS / 1000,
          times: [0, 0.42, 1],
          ease: RIVER_EASE,
          onComplete: () => {
            if (cancelled) return;
            setPhase("docked");
            window.setTimeout(() => {
              finishIntro();
            }, 160);
          },
        }),
      ];

      stopAnimations = () => controls.forEach((c) => c.stop());
    }

    const timer = window.setTimeout(() => startTravel(), 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopAnimations?.();
    };
    // Motion values are stable refs; intro only runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [introDone]);

  const activePhase: IntroPhase = introDone ? "revealed" : phase;

  const showLoadingStar = activePhase === "loading";
  const showFlyingStar = activePhase === "travel";
  const showCard = activePhase === "revealed";
  const showSlotStar = activePhase === "docked" || activePhase === "revealed";
  const showCardShell = activePhase === "docked" || activePhase === "revealed";

  return (
    <>
      <motion.div
        className="pointer-events-none fixed inset-0 z-0"
        initial={{ opacity: 0 }}
        animate={{
          opacity:
            activePhase === "loading" || activePhase === "travel" ? 1 : 0,
        }}
        transition={{ duration: 0.9 }}
        aria-hidden
      >
        <div className="absolute left-1/2 top-1/2 h-[min(80vw,28rem)] w-[min(80vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute left-[58%] top-[38%] h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-2xl" />
      </motion.div>

      {showLoadingStar && (
        <motion.div
          className="pointer-events-none fixed left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: RIVER_EASE }}
        >
          <HesiaStarMark glow />
        </motion.div>
      )}

      {showFlyingStar && (
        <motion.div
          className="pointer-events-none fixed left-0 top-0 z-50 -translate-x-1/2 -translate-y-1/2 will-change-transform"
          style={{
            x: flyX,
            y: flyY,
            scale: flyScale,
            rotate: flyRotate,
            opacity: flyOpacity,
          }}
        >
          <motion.div
            className="absolute inset-0 -m-8 rounded-full bg-accent/25 blur-2xl"
            style={{ opacity: trailOpacity }}
          />
          <HesiaStarMark glow />
        </motion.div>
      )}

      <div className="relative grid w-full">
        <div
          className="col-start-1 row-start-1 w-full opacity-0"
          aria-hidden
        >
          <Card className="rounded-3xl">
            <CardHeader className="text-center">
              <div
                ref={slotRef}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center"
              >
                <HesiaStarMark />
              </div>
              <CardTitle className="text-2xl">Welcome to Hesia</CardTitle>
              <CardDescription className="mt-2 text-base leading-relaxed">
                Track what matters. Reflect without judgment. AI that truly knows
                you — locally.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="h-11" />
              <div className="h-11" />
            </CardContent>
          </Card>
        </div>

        <motion.div
          className="col-start-1 row-start-1 w-full"
          initial={false}
          animate={{
            opacity: showCardShell ? 1 : 0,
            scale: showCardShell ? 1 : 0.98,
          }}
          transition={{ duration: 0.45, ease: RIVER_EASE }}
          style={{ pointerEvents: showCardShell ? "auto" : "none" }}
          aria-hidden={activePhase === "loading" || activePhase === "travel"}
        >
          <Card className="relative z-10 rounded-3xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
                <motion.div
                  initial={false}
                  animate={{
                    opacity: showSlotStar ? 1 : 0,
                    scale: showSlotStar ? 1 : 0.8,
                  }}
                  transition={{ duration: 0.32, ease: RIVER_EASE }}
                >
                  <HesiaStarMark glow={activePhase === "docked"} />
                </motion.div>
              </div>

              <motion.div
                initial={false}
                animate={{
                  opacity: showCard ? 1 : 0,
                  y: showCard ? 0 : 20,
                  filter: showCard ? "blur(0px)" : "blur(8px)",
                }}
                transition={{ duration: 0.72, ease: RIVER_EASE }}
              >
                <CardTitle className="text-2xl">Welcome to Hesia</CardTitle>
                <CardDescription className="mt-2 text-base leading-relaxed">
                  Track what matters. Reflect without judgment. AI that truly knows
                  you — locally.
                </CardDescription>
              </motion.div>
            </CardHeader>

            <motion.div
              initial={false}
              animate={{
                opacity: showCard ? 1 : 0,
                y: showCard ? 0 : 28,
              }}
              transition={{
                duration: 0.78,
                delay: showCard ? 0.14 : 0,
                ease: RIVER_EASE,
              }}
            >
              <CardContent className="flex flex-col gap-3">
                <Button onClick={onNext} size="lg" className="w-full" disabled={!showCard}>
                  Begin gently
                </Button>
                <Button
                  variant="ghost"
                  onClick={onSkip}
                  className="w-full"
                  disabled={!showCard}
                >
                  Skip for now
                </Button>
              </CardContent>
            </motion.div>
          </Card>
        </motion.div>
      </div>
    </>
  );
}