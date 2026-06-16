import { v4 as uuidv4 } from "uuid";
import { format, subDays, subHours } from "date-fns";
import { db } from "./schema";
import { toISO } from "@/lib/utils/dates";
import type { Task } from "@/types/task";
import type { Tag } from "@/types/tag";
import type { Category } from "@/types/category";
import type { UserMemoryEntry } from "@/types/settings";

const SAMPLE_TAGS: Tag[] = [
  { name: "health", colorHex: "#10b981", usageCount: 0 },
  { name: "movement", colorHex: "#14b8a6", usageCount: 0 },
  { name: "deep-work", colorHex: "#6366f1", usageCount: 0 },
  { name: "learning", colorHex: "#8b5cf6", usageCount: 0 },
  { name: "admin", colorHex: "#f59e0b", usageCount: 0 },
  { name: "writing", colorHex: "#ec4899", usageCount: 0 },
];

const SAMPLE_CATEGORIES: Category[] = [
  {
    name: "Health",
    colorHex: "#10b981",
    iconName: "heart",
    usageCount: 0,
  },
  {
    name: "Deep Work",
    colorHex: "#6366f1",
    iconName: "focus",
    usageCount: 0,
  },
  {
    name: "Learning",
    colorHex: "#8b5cf6",
    iconName: "book-open",
    usageCount: 0,
  },
  {
    name: "Life Admin",
    colorHex: "#f59e0b",
    iconName: "clipboard",
    usageCount: 0,
  },
];

function makeTask(
  opts: Omit<Task, "id" | "createdAt" | "sortOrder"> & {
    daysAgo?: number;
    sortOrder?: number;
  },
): Task {
  const { daysAgo = 0, sortOrder = 0, status, ...fields } = opts;
  const created = subDays(new Date(), daysAgo);
  const boardDay = format(created, "yyyy-MM-dd");

  return {
    id: uuidv4(),
    createdAt: toISO(created),
    sortOrder,
    status,
    boardDate: status === "inbox" ? undefined : boardDay,
    startedOnBoardDate:
      status === "inbox"
        ? undefined
        : status === "todo" || status === "doing"
          ? boardDay
          : fields.startedOnBoardDate,
    ...fields,
  };
}

export async function loadSampleData(): Promise<void> {
  const now = new Date();

  await db.tags.bulkPut(SAMPLE_TAGS);
  await db.categories.bulkPut(SAMPLE_CATEGORIES);

  const tasks: Task[] = [
    makeTask({
      title: "25min morning yoga",
      description: "Felt centered and energized afterward",
      status: "done",
      isPlanned: false,
      tags: ["health", "movement"],
      category: "Health",
      completedAt: toISO(subHours(now, 2)),
      durationMinutes: 25,
      daysAgo: 0,
      sortOrder: 0,
    }),
    makeTask({
      title: "Plan Q3 content calendar",
      status: "todo",
      isPlanned: true,
      tags: ["deep-work", "writing"],
      category: "Deep Work",
      daysAgo: 1,
      sortOrder: 0,
    }),
    makeTask({
      title: "Read chapter on local-first apps",
      status: "doing",
      isPlanned: true,
      tags: ["learning"],
      category: "Learning",
      daysAgo: 2,
      sortOrder: 0,
      dayTransitions: [
        {
          fromBoardDate: format(subDays(new Date(), 3), "yyyy-MM-dd"),
          toBoardDate: format(subDays(new Date(), 2), "yyyy-MM-dd"),
          fromStatus: "doing",
          toStatus: "doing",
          at: toISO(subDays(new Date(), 2)),
          reason: "carry_forward",
        },
      ],
    }),
    makeTask({
      title: "Quick inbox cleanup",
      status: "done",
      isPlanned: false,
      tags: ["admin"],
      category: "Life Admin",
      completedAt: toISO(subDays(now, 1)),
      durationMinutes: 15,
      daysAgo: 1,
      sortOrder: 1,
    }),
    makeTask({
      title: "Walked dog in the park",
      status: "done",
      isPlanned: false,
      tags: ["health", "movement"],
      category: "Health",
      completedAt: toISO(subDays(now, 2)),
      durationMinutes: 30,
      daysAgo: 2,
      sortOrder: 2,
    }),
    makeTask({
      title: "Finish Hesia weekly report feature",
      status: "todo",
      isPlanned: true,
      tags: ["deep-work"],
      category: "Deep Work",
      daysAgo: 0,
      sortOrder: 1,
    }),
    makeTask({
      title: "Draft blog post outline",
      status: "todo",
      isPlanned: true,
      tags: ["writing", "deep-work"],
      category: "Deep Work",
      daysAgo: -2,
      sortOrder: 0,
    }),
    makeTask({
      title: "Call dentist for appointment",
      status: "inbox",
      isPlanned: false,
      tags: ["admin"],
      category: "Life Admin",
      daysAgo: 0,
      sortOrder: 0,
    }),
    makeTask({
      title: "Completed TypeScript generics course",
      status: "done",
      isPlanned: true,
      tags: ["learning"],
      category: "Learning",
      completedAt: toISO(subDays(now, 3)),
      durationMinutes: 90,
      daysAgo: 3,
      sortOrder: 3,
    }),
  ];

  await db.tasks.bulkPut(tasks);

  // Update tag usage counts
  const tagCounts: Record<string, number> = {};
  for (const task of tasks) {
    for (const tag of task.tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }
  for (const [name, count] of Object.entries(tagCounts)) {
    await db.tags.update(name, { usageCount: count, lastUsedAt: toISO(now) });
  }

  const categoryCounts: Record<string, number> = {};
  for (const task of tasks) {
    if (task.category) {
      categoryCounts[task.category] = (categoryCounts[task.category] ?? 0) + 1;
    }
  }
  for (const [name, count] of Object.entries(categoryCounts)) {
    await db.categories.update(name, { usageCount: count });
  }

  const memory: UserMemoryEntry[] = [
    {
      id: uuidv4(),
      type: "goal",
      content: "Build a calm daily rhythm balancing deep work and movement",
      source: "user",
      updatedAt: toISO(now),
    },
    {
      id: uuidv4(),
      type: "preference",
      content: "Prefers morning movement and afternoon focus blocks",
      source: "user",
      updatedAt: toISO(now),
    },
  ];

  await db.userMemory.bulkPut(memory);
}

export async function hasExistingTasks(): Promise<boolean> {
  const count = await db.tasks.count();
  return count > 0;
}