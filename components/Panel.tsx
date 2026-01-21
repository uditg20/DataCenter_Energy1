import { clsx } from "clsx";
import type { PropsWithChildren } from "react";

export function Panel({ title, children, className }: PropsWithChildren<{ title: string; className?: string }>) {
  return (
    <section className={clsx("rounded-2xl bg-white shadow-sm border border-slate-200 p-6", className)}>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">{title}</h2>
      {children}
    </section>
  );
}
