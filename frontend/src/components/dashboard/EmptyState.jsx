import { Card } from "@/components/ui/card";

const EmptyState = ({ icon: Icon, title, description }) => (
  <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
      <Icon className="h-5 w-5 text-muted-foreground" />
    </div>
    <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
    {description && (
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    )}
  </Card>
);

export default EmptyState;
