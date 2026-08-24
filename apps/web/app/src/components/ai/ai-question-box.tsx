"use client";

import { useState } from "react";
import { ArrowRight, MessageCircleQuestion } from "lucide-react";

import { suggestedAiQuestions } from "../../lib/ai";
import { Button } from "../ui/button";

export function AiQuestionBox({
  isLoading,
  onAsk,
}: {
  isLoading: boolean;
  onAsk: (question: string) => Promise<void>;
}) {
  const [question, setQuestion] = useState("");

  async function submitQuestion(value = question) {
    const normalized = value.trim();

    if (normalized.length < 3) {
      return;
    }

    setQuestion(normalized);
    await onAsk(normalized);
  }

  return (
    <section className="rounded-[1.5rem] border border-[#d8e3dc] bg-gradient-to-br from-white to-[#f3f8f4] p-5 shadow-[0_12px_35px_rgba(24,54,38,0.04)] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#dff4e7] text-[#0d6946]">
          <MessageCircleQuestion className="size-4" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-[#25332b]">
            Aprofunde esta análise
          </h3>
          <p className="mt-1 text-xs leading-5 text-[#748078]">
            Faça uma pergunta guiada sobre os mesmos dados do período. Cada envio gera uma nova leitura.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestedAiQuestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={isLoading}
            onClick={() => {
              setQuestion(suggestion);
              void submitQuestion(suggestion);
            }}
            className="min-h-10 rounded-xl border border-[#dbe5de] bg-white px-3 text-left text-xs font-semibold text-[#526259] transition hover:-translate-y-0.5 hover:border-[#a9d4b9] hover:text-[#0b6543] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void submitQuestion();
        }}
      >
        <label className="sr-only" htmlFor="ai-question">
          Pergunta sobre seus dados financeiros
        </label>
        <input
          id="ai-question"
          value={question}
          maxLength={300}
          disabled={isLoading}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ex.: o que merece minha atenção primeiro?"
          className="min-h-12 min-w-0 flex-1 rounded-2xl border border-[#d7e1da] bg-white px-4 text-sm text-[#27342d] outline-none transition placeholder:text-[#9aa49d] focus:border-[#58af79] focus:ring-4 focus:ring-[#50b877]/10 disabled:opacity-60"
        />
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={question.trim().length < 3}
          className="shrink-0"
        >
          Perguntar
          {!isLoading && <ArrowRight className="size-4" />}
        </Button>
      </form>
    </section>
  );
}
