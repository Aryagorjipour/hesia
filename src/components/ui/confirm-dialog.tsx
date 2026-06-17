"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConfirmStore } from "@/stores/confirm-store";

export function ConfirmDialog() {
  const open = useConfirmStore((s) => s.open);
  const options = useConfirmStore((s) => s.options);
  const respond = useConfirmStore((s) => s.respond);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) respond(false);
      }}
    >
      <DialogContent className="sm:max-w-md" showClose={false}>
        <DialogHeader>
          <DialogTitle>{options?.title ?? "Confirm"}</DialogTitle>
          <DialogDescription>{options?.description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => respond(false)}
          >
            {options?.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            type="button"
            variant={options?.destructive ? "destructive" : "default"}
            onClick={() => respond(true)}
          >
            {options?.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}