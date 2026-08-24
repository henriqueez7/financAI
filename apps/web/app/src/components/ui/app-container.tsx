import type {
  ReactNode,
} from "react";

interface AppContainerProps {
  children: ReactNode;
  className?: string;
}

export function AppContainer({
  children,
  className = "",
}: AppContainerProps) {
  return (
    <div
      className={`
        mx-auto w-full
        max-w-[1440px]
        px-4 sm:px-6 lg:px-8
        ${className}
      `}
    >
      {children}
    </div>
  );
}