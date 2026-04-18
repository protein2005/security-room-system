export function EmptyState({ title, description, actions }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-white/40 px-6 py-10 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {actions ? <div className="mt-4 flex justify-center gap-3">{actions}</div> : null}
    </div>
  );
}
