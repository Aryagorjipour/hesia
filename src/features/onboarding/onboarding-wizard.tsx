"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { WeekStartsOn } from "@/lib/utils/week-config";
import {
  Database,
  KeyRound,
  Target,
  CalendarDays,
  User,
} from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { WelcomeStep } from "./welcome-step";
import { WeekStartPicker } from "@/features/settings/week-start-picker";
import { DEFAULT_WEEK_STARTS_ON } from "@/lib/utils/week-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/db/schema";
import { loadSampleData, hasExistingTasks } from "@/lib/db/seed";
import { v4 as uuidv4 } from "uuid";
import { toISO } from "@/lib/utils/dates";

const STEPS = [
  "welcome",
  "profile",
  "philosophy",
  "calendar",
  "goals",
  "sample",
] as const;
type Step = (typeof STEPS)[number];

export function OnboardingWizard() {
  const router = useRouter();
  const reducedMotion = usePrefersReducedMotion();
  const [step, setStep] = useState<Step>("welcome");
  const [username, setUsername] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [goal, setGoal] = useState("");
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartsOn>(
    DEFAULT_WEEK_STARTS_ON,
  );
  const [loading, setLoading] = useState(false);
  const [welcomeIntroDone, setWelcomeIntroDone] = useState(false);

  const stepIndex = STEPS.indexOf(step);

  const handleWelcomeIntroComplete = useCallback(() => {
    setWelcomeIntroDone(true);
  }, []);

  async function completeOnboarding(withSampleData: boolean) {
    setLoading(true);
    try {
      if (withSampleData && !(await hasExistingTasks())) {
        await loadSampleData();
      }

      if (goal.trim()) {
        await db.userMemory.put({
          id: uuidv4(),
          type: "goal",
          content: goal.trim(),
          source: "user",
          updatedAt: toISO(new Date()),
        });
      }

      await db.settings.update("default", {
        onboardingComplete: true,
        weekStartsOn,
        profile: {
          username: username.trim() || undefined,
          workspaceName: workspaceName.trim() || undefined,
        },
      });
      router.replace("/board");
    } finally {
      setLoading(false);
    }
  }

  function next() {
    const nextStep = STEPS[stepIndex + 1];
    if (nextStep) setStep(nextStep);
  }

  function skip() {
    void completeOnboarding(false);
  }

  return (
    <div className="flex min-h-dvh-safe items-center justify-center bg-background px-6 pb-safe pt-safe">
      <div className="w-full max-w-lg py-6">
        <motion.div
          className="mb-8 flex h-1.5 justify-center gap-2"
          initial={false}
          animate={{
            opacity: welcomeIntroDone || step !== "welcome" ? 1 : 0,
          }}
          transition={{
            duration: reducedMotion ? 0.01 : 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
          aria-hidden={!welcomeIntroDone && step === "welcome"}
        >
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= stepIndex ? "w-8 bg-accent" : "w-4 bg-muted"
              }`}
            />
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === "welcome" && (
              <WelcomeStep
                onNext={next}
                onSkip={skip}
                introDone={welcomeIntroDone}
                onIntroComplete={handleWelcomeIntroComplete}
              />
            )}

            {step === "profile" && (
              <Card className="rounded-3xl">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                    <User className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle>Make it yours</CardTitle>
                  <CardDescription>
                    A name and workspace help Hesia feel personal — stored only
                    on your device.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="onboard-username">Your name</Label>
                    <Input
                      id="onboard-username"
                      placeholder="e.g. Alex"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={40}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="onboard-workspace">Workspace name</Label>
                    <Input
                      id="onboard-workspace"
                      placeholder="e.g. Morning Rhythm"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      maxLength={60}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={next} className="flex-1">
                      Skip
                    </Button>
                    <Button onClick={next} className="flex-1">
                      Continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === "philosophy" && (
              <Card className="rounded-3xl">
                <CardHeader>
                  <CardTitle>Your space, your data</CardTitle>
                  <CardDescription className="leading-relaxed">
                    Everything lives in your browser. No accounts, no telemetry.
                    Export anytime for backup or sync across devices.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
                    <p className="mb-2">
                      <strong className="text-foreground">Planned work</strong>{" "}
                      — intentions you set ahead of time.
                    </p>
                    <p>
                      <strong className="text-foreground">Flow wins</strong> —
                      the little things you do along the way. Both matter.
                    </p>
                  </div>
                  <Button onClick={next} className="w-full">
                    Continue
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === "calendar" && (
              <Card className="rounded-3xl">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                    <CalendarDays className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle>Your week</CardTitle>
                  <CardDescription>
                    Reports and reflections follow this calendar — change it
                    anytime in Settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <WeekStartPicker
                    value={weekStartsOn}
                    onChange={setWeekStartsOn}
                    compact
                    label="First day of week"
                    description=""
                  />
                  <Button onClick={next} className="w-full">
                    Continue
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === "goals" && (
              <Card className="rounded-3xl">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                    <Target className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle>A gentle intention</CardTitle>
                  <CardDescription>
                    Optional — this seeds your AI companion&apos;s memory.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="e.g. Build a calm daily rhythm with more movement"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={next} className="flex-1">
                      Skip
                    </Button>
                    <Button onClick={next} className="flex-1">
                      Save & continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === "sample" && (
              <Card className="rounded-3xl">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                    <Database className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle>See it in action</CardTitle>
                  <CardDescription>
                    Load calm sample data — a mix of planned work and flow wins
                    across Health, Deep Work, Learning, and Life Admin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => void completeOnboarding(true)}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    Load sample data
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void completeOnboarding(false)}
                    disabled={loading}
                    className="w-full"
                  >
                    Start with a blank board
                  </Button>
                  <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                    <KeyRound className="h-3 w-3" />
                    AI setup available anytime in Settings
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}