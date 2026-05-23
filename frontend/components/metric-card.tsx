import { Card } from "@/components/ui/card";

export function MetricCard({
  title,
  value,
  caption,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  value: string;
  caption: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>

        <div className="grid size-10 place-items-center rounded-md bg-sky-500/12 text-sky-600">
          <Icon className={`h-5 w-5 ${iconClassName ?? ""}`} />
        </div>
      </div>

      <p className="mt-4 text-xs text-emerald-600">{caption}</p>
    </Card>
  );
}
