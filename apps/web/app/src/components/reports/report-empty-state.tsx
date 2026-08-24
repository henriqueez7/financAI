import type { ComponentType } from "react";
import { BarChart3 } from "lucide-react";

export function ReportEmptyState({
  title,
  description,
  icon: Icon = BarChart3,
}: {
  title: string;
  description: string;
  icon?: ComponentType<{
    className?: string;
  }>;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-[#d7e2da] bg-[#fafcfb] px-5 py-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[#e7f5ec] text-[#0c8553]">
        <Icon className="size-5" />
      </div>

      <p className="mt-4 text-sm font-bold text-[#2d3a32]">
        {title}
      </p>

      <p className="mt-2 max-w-sm text-xs leading-5 text-[#7d8981]">
        {description}
      </p>
    </div>
  );
}
