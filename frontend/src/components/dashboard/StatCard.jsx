import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const StatCard = ({ label, value, icon: Icon, hint, active, onClick, testId }) => (
  <button
    type="button"
    data-testid={testId}
    onClick={onClick}
    className="group text-left"
  >
    <Card
      className={cn(
        "h-full border p-5 transition-colors",
        active
          ? "border-primary/60 bg-primary/5"
          : "border-border bg-card hover:border-foreground/20"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          )}
        />
        <span
          className={cn(
            "font-display text-2xl font-bold tabular-nums",
            active ? "text-primary" : "text-foreground"
          )}
        >
          {value}
        </span>
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground/70">{hint}</p>}
    </Card>
  </button>
);

export default StatCard;
