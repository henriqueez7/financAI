"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CategoryForm } from "../../src/components/categories/category-form";

export default function NewCategoryPage() {
  const router = useRouter();

  return (
    <main className="min-h-dvh bg-[#f2f5f2] text-[#17211c]">
      <header className="sticky top-0 z-30 border-b border-[#dde5df] bg-[#f2f5f2]/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3">
          <Link
            href="/categories"
            aria-label="Voltar para categorias"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#d8e1da] bg-white text-[#0c4f38] shadow-sm transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="size-5" />
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-[-0.035em] sm:text-2xl">
              Nova categoria
            </h1>

            <p className="mt-0.5 text-xs text-[#78847c]">
              Crie uma categoria para organizar sua vida financeira.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <CategoryForm
          onSuccess={() => {
            window.setTimeout(() => {
              router.replace("/categories");
              router.refresh();
            }, 700);
          }}
        />
      </div>
    </main>
  );
}
