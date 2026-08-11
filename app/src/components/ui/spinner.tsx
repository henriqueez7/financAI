interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({
  size = "md",
  className = "",
}: SpinnerProps) {
  const sizes = {
    sm: "size-4",
    md: "size-6",
    lg: "size-9",
  };

  return (
    <span
      className={`
        inline-block animate-spin
        rounded-full border-2
        border-current
        border-r-transparent
        ${sizes[size]}
        ${className}
      `}
    />
  );
}