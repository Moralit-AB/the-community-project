"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import type { ActionResult } from "@/lib/types";
import { Alert } from "./ui";

/**
 * A <form> wired to a Server Action that returns an ActionResult. It shows the
 * success or error message under the form, and can reset the fields on success.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  hideSuccess = false,
}: {
  action: (state: ActionResult, formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  hideSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.message && !(state.ok && hideSuccess) && (
        <div className="mt-3">
          <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>
        </div>
      )}
    </form>
  );
}
