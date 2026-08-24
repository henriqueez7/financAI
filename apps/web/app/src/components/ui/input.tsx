import type {
  InputHTMLAttributes,
  ReactNode,
} from "react";

interface InputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
}

export function Input({
  label,
  icon,
  error,
  className = "",
  id,
  ...props
}: InputProps) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="
            block text-sm font-semibold
            text-[#2e3c34]
          "
        >
          {label}
        </label>
      )}

      <div
        className={`
          group relative
          ${label ? "mt-2" : ""}
        `}
      >
        {icon && (
          <div
            className="
              pointer-events-none absolute
              left-4 top-1/2
              -translate-y-1/2
              text-[#87928b]
              transition-colors
              group-focus-within:text-[#0c7a4d]
            "
          >
            {icon}
          </div>
        )}

        <input
          id={id}
          className={`
            min-h-14 w-full rounded-2xl
            border bg-[#fafcfb]
            px-4 text-sm text-[#17211c]
            outline-none transition
            placeholder:text-[#99a49d]
            focus:bg-white
            focus:ring-4
            disabled:cursor-not-allowed
            disabled:opacity-60
            ${
              icon
                ? "pl-12"
                : ""
            }
            ${
              error
                ? "border-[#e58a8a] focus:border-[#df4545] focus:ring-[#df4545]/10"
                : "border-[#d8e1da] focus:border-[#65b98a] focus:ring-[#24b46b]/10"
            }
            ${className}
          `}
          {...props}
        />
      </div>

      {error && (
        <p className="mt-2 text-xs font-medium text-[#c43d3d]">
          {error}
        </p>
      )}
    </div>
  );
}