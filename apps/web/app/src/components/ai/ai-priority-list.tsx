import {
  ArrowUpRight,
  ClipboardList,
  Compass,
} from "lucide-react";

import type {
  AiAnalysisPriority,
  AiRecommendation,
} from "../../lib/ai";

const priorityLabels = {
  HIGH: "Alta prioridade",
  MEDIUM: "Média prioridade",
  LOW: "Baixa prioridade",
};

export function AiPriorityList({
  priorities,
  recommendations,
}: {
  priorities: AiAnalysisPriority[];
  recommendations: AiRecommendation[];
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
      <section className="rounded-[1.5rem] border border-[#dfe6e1] bg-white p-5 shadow-[0_12px_35px_rgba(24,54,38,0.04)] sm:p-6">
        <div className="flex items-center gap-2 text-[#174f39]">
          <Compass className="size-4" />
          <h3 className="text-sm font-bold">
            Prioridades do período
          </h3>
        </div>

        <div className="mt-4 space-y-3">
          {priorities.length > 0 ? (
            priorities.map((priority, index) => (
              <article
                key={`${priority.title}-${index}`}
                className="rounded-2xl border border-[#e1e8e3] bg-[#f8faf8] p-4"
              >
                <div className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#0d6445] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-[#25332b]">
                      {priority.title}
                    </h4>
                    <p className="mt-1.5 text-xs leading-5 text-[#69766e]">
                      {priority.rationale}
                    </p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-[#748078]">
              Nenhuma prioridade adicional foi identificada.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-[#dfe6e1] bg-white p-5 shadow-[0_12px_35px_rgba(24,54,38,0.04)] sm:p-6">
        <div className="flex items-center gap-2 text-[#174f39]">
          <ClipboardList className="size-4" />
          <h3 className="text-sm font-bold">
            Próximos passos sugeridos
          </h3>
        </div>

        <div className="mt-4 space-y-3">
          {recommendations.length > 0 ? (
            recommendations.map((recommendation) => (
              <article
                key={`${recommendation.title}-${recommendation.suggestion}`}
                className="rounded-2xl border border-[#dbe7df] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-bold text-[#25332b]">
                    {recommendation.title}
                  </h4>
                  <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-[#19915e]" />
                </div>
                <p className="mt-1.5 text-xs leading-5 text-[#69766e]">
                  {recommendation.suggestion}
                </p>
                <span className="mt-3 inline-flex rounded-full bg-[#eff6f1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#357054]">
                  {priorityLabels[recommendation.priority]}
                </span>
              </article>
            ))
          ) : (
            <p className="text-sm text-[#748078]">
              Nenhuma ação adicional foi sugerida.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
