import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn.js";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  readonly variant?: ButtonVariant;
  readonly children: ReactNode;
  readonly className?: string;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "border-radiant bg-radiant text-void hover:brightness-110 font-medium",
  secondary:
    "border-hairline-strong bg-surface-raised text-ink hover:border-radiant/60",
  ghost: "border-transparent bg-transparent text-ink-muted hover:text-ink",
  danger:
    "border-negative/50 bg-negative/10 text-negative hover:bg-negative/20",
};

/** The one button. Disabled buttons stay legible and say why via `title`. */
export function Button({
  variant = "secondary",
  children,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
        "transition-[color,background-color,border-color] duration-(--motion-fast) ease-(--ease-out-seldon)",
        "disabled:cursor-not-allowed disabled:opacity-45",
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
