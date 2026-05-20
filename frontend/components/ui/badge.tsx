import { cn } from "@/lib/utils";

export function Badge({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "blue" | "amber" | "red" | "slate" }) {
  const tones = {
    green: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    blue: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
    amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    red: "bg-red-500/12 text-red-700 dark:text-red-300",
    slate: "bg-slate-500/12 text-slate-700 dark:text-slate-300"
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}
