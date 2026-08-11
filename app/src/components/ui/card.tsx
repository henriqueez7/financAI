import type {
  HTMLAttributes,
  ReactNode,
} from "react";

interface CardProps
  extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export function Card({
  children,
  padded = true,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-[1.7rem]
        border border-[#dfe6e1]
        bg-white
        shadow-[0_14px_42px_rgba(21,53,36,0.055)]
        ${padded ? "p-5 sm:p-6" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}