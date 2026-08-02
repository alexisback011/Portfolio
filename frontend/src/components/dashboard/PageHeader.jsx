const PageHeader = ({ eyebrow, title, description, children }) => (
  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div className="min-w-0">
      {eyebrow && (
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-2 break-words font-display text-2xl font-bold tracking-tight md:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
    {children && <div className="shrink-0">{children}</div>}
  </div>
);

export default PageHeader;
