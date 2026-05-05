import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Підтвердити",
  cancelLabel = "Скасувати",
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-slate-950/45" aria-label="Закрити діалог" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-[2rem] border border-white/60 bg-white p-6 shadow-2xl">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Виконання..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
