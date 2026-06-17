export type CommandItemType =
  | "page"
  | "task"
  | "board-day"
  | "tag"
  | "category"
  | "report-week"
  | "chat-session"
  | "chat-message";

export interface CommandItem {
  id: string;
  type: CommandItemType;
  label: string;
  description?: string;
  keywords?: string[];
  score?: number;
  href?: string;
  taskId?: string;
  boardDate?: string;
  tagName?: string;
  categoryName?: string;
  weekStart?: string;
  chatSessionId?: string;
  chatMessageId?: string;
}

export const COMMAND_GROUP_LABELS: Record<CommandItemType, string> = {
  page: "Pages",
  "board-day": "Board days",
  task: "Tasks",
  tag: "Tags",
  category: "Categories",
  "report-week": "Reports",
  "chat-session": "Chats",
  "chat-message": "Chat messages",
};

export const COMMAND_GROUP_ORDER: CommandItemType[] = [
  "page",
  "board-day",
  "task",
  "tag",
  "category",
  "report-week",
  "chat-session",
  "chat-message",
];