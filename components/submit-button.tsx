"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Button } from "./ui";

/** A submit button that disables itself while the form is sending. Pass `confirm` to ask first. */
export function SubmitButton({
  children,
  pendingText,
  confirm,
  ...props
}: ComponentProps<typeof Button> & { pendingText?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      aria-busy={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      {...props}
    >
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
