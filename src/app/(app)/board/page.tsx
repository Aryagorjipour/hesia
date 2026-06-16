import { BoardView } from "@/features/board/board-view";

export default function BoardPage() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <BoardView />
    </div>
  );
}