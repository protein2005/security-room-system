import { Button } from "@/components/ui/button";

export function ErrorState({ title, description, onRetry }) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
      <h3 className="text-lg font-semibold text-rose-900">{title}</h3>
      <p className="mt-2 text-sm text-rose-800">{description}</p>
      {onRetry ? (
        <div className="mt-4">
          <Button onClick={onRetry}>Спробувати ще раз</Button>
        </div>
      ) : null}
    </div>
  );
}
