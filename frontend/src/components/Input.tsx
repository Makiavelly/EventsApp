import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { clsx } from "clsx";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

function FieldText({ hint, error }: { hint?: string; error?: string }) {
  if (!hint && !error) {
    return null;
  }

  return <p className={clsx("text-xs", error ? "text-clay" : "text-ink/55")}>{error ?? hint}</p>;
}

export function Input({ label, hint, error, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="grid gap-2 text-sm font-bold text-ink" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        className={clsx(
          "focus-ring min-h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink placeholder:text-ink/35",
          error && "border-clay",
          className,
        )}
        {...props}
      />
      <FieldText hint={hint} error={error} />
    </label>
  );
}

export function Textarea({ label, hint, error, className, id, ...props }: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <label className="grid gap-2 text-sm font-bold text-ink" htmlFor={textareaId}>
      {label}
      <textarea
        id={textareaId}
        className={clsx(
          "focus-ring min-h-32 w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3 text-base text-ink placeholder:text-ink/35",
          error && "border-clay",
          className,
        )}
        {...props}
      />
      <FieldText hint={hint} error={error} />
    </label>
  );
}
