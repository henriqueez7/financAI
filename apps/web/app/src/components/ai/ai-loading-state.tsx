import { Sparkles } from "lucide-react";

import { Skeleton } from "../ui/skeleton";

export function AiLoadingState() {
  return (
    <div
      role="status"
      aria-label="Gerando análise financeira"
      className="space-y-5"
    >
      <section className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#0b3e2e] via-[#0d5239] to-[#16865a] p-6 text-white shadow-[0_24px_60px_rgba(10,66,45,0.2)] sm:p-8">
        <div className="flex items-center gap-3 text-sm font-semibold text-white/80">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-white/10">
            <Sparkles className="size-4 animate-pulse" />
          </span>
          Analisando os fatos do período
        </div>

        <Skeleton className="mt-7 h-8 w-4/5 bg-white/15" />
        <Skeleton className="mt-4 h-4 w-full bg-white/10" />
        <Skeleton className="mt-2 h-4 w-3/4 bg-white/10" />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1].map((item) => (
          <section
            key={item}
            className="rounded-[1.5rem] border border-[#dfe6e1] bg-white p-5"
          >
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-5 h-20 w-full" />
            <Skeleton className="mt-3 h-20 w-full" />
          </section>
        ))}
      </div>
    </div>
  );
}
