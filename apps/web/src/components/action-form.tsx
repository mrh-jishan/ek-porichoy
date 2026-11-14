"use client";
import { useTranslations } from "next-intl";
import { useActionState, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@ep/ui";
import type { ActionResult } from "@/server/action";

type ServerAction<T> = (prev: ActionResult<T> | null, form: FormData) => Promise<ActionResult<T>>;

/**
 * Generic progressive-enhancement form for any server action built with defineAction.
 * Handles pending state, localized error/success toasts and reset - so no page re-implements them.
 */
export function ActionForm<T>({ action, children, className, successKey, reset, onSuccess }: {
  action: ServerAction<T>;
  children: ReactNode;
  className?: string;
  /** i18n key for the success toast; receives the action's returned data as ICU values. */
  successKey?: string;
  reset?: boolean;
  /** Client-side hook, e.g. invalidating a TanStack Query cache after a mutation. */
  onSuccess?: (data: T | undefined) => void;
}) {
  const t = useTranslations();
  const ref = useRef<HTMLFormElement>(null);
  // Notify inside the action itself (not in an effect): revalidation often unmounts the form
  // (e.g. an "Apply" button disappears once enrolled), which would swallow effect-based toasts.
  const [, formAction] = useActionState(async (prev: ActionResult<T> | null, form: FormData) => {
    const state = await action(prev, form);
    if (state.ok) {
      const values = (state.data && typeof state.data === "object" ? state.data : {}) as Record<string, string | number>;
      toast.success(successKey ? t(successKey as never, values as never) : t("common.success"));
      if (reset) ref.current?.reset();
      onSuccess?.(state.data);
    } else {
      const key = `errors.${state.error}`;
      toast.error(t.has(key as never) ? t(key as never) : t("errors.generic"));
    }
    return state;
  }, null);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
    </form>
  );
}

export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending} {...props}>{children}</Button>;
}

/** A one-click action button (approve / reject / settle …) with hidden fields. */
export function ActionButton<T>({ action, fields, children, successKey, onSuccess, ...props }: ButtonProps & {
  action: ServerAction<T>; fields: Record<string, string>; successKey?: string; onSuccess?: (data: T | undefined) => void;
}) {
  return (
    <ActionForm action={action} successKey={successKey} onSuccess={onSuccess} className="inline">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton {...props}>{children}</SubmitButton>
    </ActionForm>
  );
}
