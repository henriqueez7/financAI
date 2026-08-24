import type {
  ReactNode,
} from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  backAction?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  backAction,
  actions,
}: PageHeaderProps) {
  return (
    <header
      className="
        sticky top-0 z-30
        border-b border-[#dde5df]
        bg-[#f2f5f2]/90
        py-3 backdrop-blur-xl
      "
    >
      <div
        className="
          mx-auto flex max-w-[1440px]
          items-center gap-3
          px-4 sm:px-6 lg:px-8
        "
      >
        {backAction}

        <div className="min-w-0 flex-1">
          <h1
            className="
              truncate text-xl font-bold
              tracking-[-0.035em]
              sm:text-2xl
            "
          >
            {title}
          </h1>

          {description && (
            <p className="mt-0.5 text-xs text-[#78847c]">
              {description}
            </p>
          )}
        </div>

        {actions}
      </div>
    </header>
  );
}