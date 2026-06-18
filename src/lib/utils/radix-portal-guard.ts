/**
 * Returns true when a pointer/focus event targets portaled Radix UI content
 * (or its trigger) that lives outside a parent Dialog in the DOM tree.
 *
 * Dialog must ignore these interactions — otherwise opening/closing a nested
 * Select, Popover, or DropdownMenu dismisses the modal (e.g. clicking a
 * Select trigger while the menu is open passes through to the overlay).
 */
export function shouldIgnoreDialogOutsideInteraction(
  target: EventTarget | null,
): boolean {
  if (!(target instanceof Element)) return false;

  return !!(
    target.closest('[role="listbox"]') ||
    target.closest('[role="combobox"]') ||
    target.closest('[role="menu"]') ||
    target.closest('[data-radix-select-viewport]') ||
    target.closest('[data-radix-popover-content]') ||
    target.closest('[data-radix-dropdown-menu-content]') ||
    target.closest('[data-radix-popper-content-wrapper]')
  );
}