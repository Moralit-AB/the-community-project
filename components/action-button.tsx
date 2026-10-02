import type { ReactNode } from "react";
import type { ActionResult } from "@/lib/types";
import { ActionForm } from "./action-form";
import { SubmitButton } from "./submit-button";

/** A single button that runs a Server Action and shows its result message. */
export function ActionButton({
  action,
  children,
  variant = "secondary",
  confirm,
}: {
  action: (state: ActionResult, formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  confirm?: string;
}) {
  return (
    <ActionForm action={action} className="inline-block" hideSuccess>
      <SubmitButton size="sm" variant={variant} confirm={confirm}>
        {children}
      </SubmitButton>
    </ActionForm>
  );
}
