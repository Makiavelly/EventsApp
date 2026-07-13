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
    <label className="grid gap-2 text-sm font-medium text-ink" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        className={clsx(
          "focus-ring min-h-11 w-full rounded-lg border border-ink/12 bg-white px-3 text-sm text-ink placeholder:text-ink/35",
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
    <label className="grid gap-2 text-sm font-medium text-ink" htmlFor={textareaId}>
      {label}
      <textarea
        id={textareaId}
        className={clsx(
          "focus-ring min-h-28 w-full resize-y rounded-lg border border-ink/12 bg-white px-3 py-3 text-sm text-ink placeholder:text-ink/35",
          error && "border-clay",
          className,
        )}
        {...props}
      />
      <FieldText hint={hint} error={error} />
    </label>
  );
}
