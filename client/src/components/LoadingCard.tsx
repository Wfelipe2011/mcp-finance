import { Card } from "@tremor/react";

export function LoadingCard({ title = "Carregando..." }: { title?: string }) {
  return (
    <Card className="mt-4">
      <div className="flex items-center space-x-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="text-sm text-gray-500">{title}</p>
      </div>
    </Card>
  );
}
