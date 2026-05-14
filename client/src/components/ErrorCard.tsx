import { Card, Text } from "@tremor/react";

export function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="mt-4 border-red-200">
      <Text className="text-red-600">Erro: {message}</Text>
    </Card>
  );
}
