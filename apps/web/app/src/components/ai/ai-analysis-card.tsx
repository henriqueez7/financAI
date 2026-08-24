"use client";

import {
  CheckCircle2,
  CircleAlert,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";

import type { AiGeneratedAnalysis } from "../../lib/ai";
import type { InsightSeverity } from "../../lib/insights";

const factStyles: Record<InsightSeverity, string> = {
  CRITICAL: "border-[#f1c3bf] bg-[#fff6f5] text-[#973d37]",
  WARNING: "border-[#efdbab] bg-[#fffaf0] text-[#82601e]",
  POSITIVE: "border-[#bfe3ce] bg-[#f2fbf5] text-[#176444]",
  INFO: "border-[#dce4df] bg-[#f8faf8] text-[#536158]",
};

export function AiAnalysisCard({
  analysis,
  periodLabel,
}: {
  analysis: AiGeneratedAnalysis;
  periodLabel: string;
}) {
  return (
    <div className="space-y-5">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#0a3b2b] via-[#0c553a] to-[#16895b] p-6 text-white shadow-[0_25px_70px_rgba(9,66,44,0.24)] sm:p-8"
      >
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-20 size-64 rounded-full bg-[#78edaa]/15 blur-3xl"
        />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#a3f3c4]">
            <Sparkles className="size-4" />
            Leitura orientada por IA
            <span className="font-medium normal-case tracking-normal text-white/55">
              {periodLabel}
            </span>
          </div>

          <h2 className="mt-5 max-w-3xl text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
            {analysis.headline}
          </h2>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/78 sm:text-[15px]">
            {analysis.summary}
          </p>

          {analysis.answer && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#a6f0c4]">
                <Lightbulb className="size-4" />
                Resposta à sua pergunta
              </div>
              <p className="mt-2 text-sm leading-6 text-white/85">
                {analysis.answer}
              </p>
            </div>
          )}
        </div>
      </motion.section>

      {analysis.facts.length > 0 && (
        <section className="rounded-[1.5rem] border border-[#dfe6e1] bg-white p-5 shadow-[0_12px_35px_rgba(24,54,38,0.04)] sm:p-6">
          <div className="flex items-center gap-2 text-[#184e39]">
            <CheckCircle2 className="size-4" />
            <h3 className="text-sm font-bold">
              Fatos observados
            </h3>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {analysis.facts.map((fact) => (
              <article
                key={`${fact.title}-${fact.description}`}
                className={`rounded-2xl border p-4 ${factStyles[fact.severity]}`}
              >
                <h4 className="text-sm font-bold">
                  {fact.title}
                </h4>
                <p className="mt-1.5 text-xs leading-5 opacity-80">
                  {fact.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {analysis.warnings.length > 0 && (
        <section className="rounded-[1.5rem] border border-[#eddbad] bg-[#fffaf0] p-5 text-[#71561f] sm:p-6">
          <div className="flex items-center gap-2">
            <CircleAlert className="size-4" />
            <h3 className="text-sm font-bold">
              Pontos de atenção
            </h3>
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#80672f]">
            {analysis.warnings.map((warning) => (
              <li
                key={warning}
                className="flex gap-2 before:mt-2.5 before:size-1 before:shrink-0 before:rounded-full before:bg-[#bd8f35]"
              >
                {warning}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
