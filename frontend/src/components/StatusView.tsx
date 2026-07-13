import type { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Card } from "./Card";

type StatusViewProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "neutral" | "error" | "loading";
};

export function StatusView({ title, description, action, tone = "neutral" }: StatusViewProps) {
  return (
    <Card className="grid place-items-center px-5 py-12 text-center">
      <div className="mx-auto grid max-w-md gap-3">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-ink/[0.04] text-ink">
          {tone === "loading" ? (
            <Loader2 className="animate-spin" size={22} />
          ) : (
            <AlertCircle size={22} className={tone === "error" ? "text-clay" : "text-meadow"} />
          )}
        </div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {description ? <p className="text-sm leading-6 text-ink/60">{description}</p> : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </Card>
  );
}
