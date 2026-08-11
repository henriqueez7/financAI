import type {
  HTMLAttributes,
} from "react";

export function Skeleton({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`
        animate-pulse rounded-xl
        bg-[#e3e9e4]
        ${className}
      `}
      {...props}
    />
  );
}