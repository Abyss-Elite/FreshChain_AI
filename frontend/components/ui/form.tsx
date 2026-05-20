import * as React from "react";
import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400", props.className)} />;
}

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </label>
  );
}
