import type { ReactNode } from "react";

type FormFieldProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function FormField({ title, description, children }: FormFieldProps) {
  return (
    <div className="grid gap-3 border-t border-ink/8 py-5 first:border-t-0 first:pt-0 last:pb-0 md:grid-cols-[220px_1fr]">
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description ? <p className="mt-1 text-sm text-ink/55">{description}</p> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}
