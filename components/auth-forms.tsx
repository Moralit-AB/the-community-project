"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import type { AuthStep } from "@/app/(public)/login/actions";
import { SubmitButton } from "./submit-button";
import { Alert, Checkbox, Field, Input, Textarea } from "./ui";

type Action = (state: AuthStep, formData: FormData) => Promise<AuthStep>;

/** Step 2: "check your email". The member clicks the link, or types the code from the email here. */
function CodeStep({
  email,
  message,
  verifyAction,
  onBack,
}: {
  email: string;
  message?: string;
  verifyAction: Action;
  onBack: () => void;
}) {
  const t = useTranslations("Auth");
  const [state, action] = useActionState(verifyAction, null);
  return (
    <div className="space-y-5">
      <Alert tone="success" title={t("checkEmailTitle")}>
        {message} <strong className="break-all">{email}</strong>
      </Alert>
      <form action={action} className="space-y-3">
        <input type="hidden" name="email" value={email} />
        <Field label={t("codeLabel")} hint={t("codeHint")} htmlFor="code">
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,12}"
            required
          />
        </Field>
        <SubmitButton className="w-full" pendingText={t("verifying")}>
          {t("verify")}
        </SubmitButton>
        {state && !state.ok && <Alert tone="danger">{state.message}</Alert>}
      </form>
      <button type="button" onClick={onBack} className="text-sm text-muted underline">
        {t("useAnotherEmail")}
      </button>
    </div>
  );
}

export function LoginForm({
  requestAction,
  verifyAction,
  next,
}: {
  requestAction: Action;
  verifyAction: Action;
  next?: string;
}) {
  const t = useTranslations("Auth");
  const [state, action] = useActionState(requestAction, null);
  const [reset, setReset] = useState(0);
  if (state?.ok && state.email && reset === 0) {
    return (
      <CodeStep email={state.email} message={state.message} verifyAction={verifyAction} onBack={() => setReset(1)} />
    );
  }
  return (
    <form action={action} onSubmit={() => setReset(0)} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Field label={t("email")} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <SubmitButton className="w-full" pendingText={t("sending")}>
        {t("sendLink")}
      </SubmitButton>
      {state && !state.ok && <Alert tone="danger">{state.message}</Alert>}
      <p className="text-center text-sm text-muted">
        {t("notMember")}{" "}
        <Link href="/join" className="font-medium text-primary underline">
          {t("requestMembership")}
        </Link>
      </p>
    </form>
  );
}

export function JoinForm({
  requestAction,
  verifyAction,
  joinMessage,
  joinMessagePrompt,
}: {
  requestAction: Action;
  verifyAction: Action;
  joinMessage: "off" | "optional" | "required";
  joinMessagePrompt: string;
}) {
  const t = useTranslations("Auth");
  const [state, action] = useActionState(requestAction, null);
  const [reset, setReset] = useState(0);
  if (state?.ok && state.email && reset === 0) {
    return (
      <CodeStep email={state.email} message={state.message} verifyAction={verifyAction} onBack={() => setReset(1)} />
    );
  }
  return (
    <form action={action} onSubmit={() => setReset(0)} className="space-y-4">
      <Field label={t("name")} hint={t("nameHint")} htmlFor="name">
        <Input id="name" name="name" autoComplete="name" maxLength={80} required />
      </Field>
      <Field label={t("email")} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      {joinMessage !== "off" && (
        <Field label={joinMessagePrompt + (joinMessage === "optional" ? ` (${t("optional")})` : "")} htmlFor="message">
          <Textarea id="message" name="message" maxLength={2000} required={joinMessage === "required"} />
        </Field>
      )}
      <Checkbox
        name="privacy"
        required
        label={t.rich("privacyConsent", {
          link: (chunks) => (
            <Link href="/privacy" target="_blank" className="font-medium text-primary underline">
              {chunks}
            </Link>
          ),
        })}
      />
      <SubmitButton className="w-full" pendingText={t("sending")}>
        {t("requestMembership")}
      </SubmitButton>
      {state && !state.ok && <Alert tone="danger">{state.message}</Alert>}
      <p className="text-center text-sm text-muted">
        {t("alreadyMember")}{" "}
        <Link href="/login" className="font-medium text-primary underline">
          {t("login")}
        </Link>
      </p>
    </form>
  );
}
