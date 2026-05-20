import * as React from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" | "ghost" }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50",
        variant === "default" && "bg-primary text-primary-foreground shadow-glow hover:brightness-105",
        variant === "outline" && "border bg-transparent hover:bg-muted",
        variant === "ghost" && "hover:bg-muted",
        className
      )}
      {...props}
    />
  );
}
