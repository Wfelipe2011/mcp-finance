import { describe, expect, it, mock, afterEach } from "bun:test";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { DetailHeader } from "./DetailHeader.tsx";

afterEach(() => cleanup());

describe("DetailHeader", () => {
  it("renderiza título e descrição", () => {
    render(
      <DetailHeader
        title="Gastos"
        description="Transações e categorias do mês"
        origin="hoje"
        onBack={() => {}}
      />,
    );
    expect(screen.getByText("Gastos")).toBeTruthy();
    expect(screen.getByText("Transações e categorias do mês")).toBeTruthy();
  });

  it("exibe botão 'Voltar para Hoje' quando origin=hoje", () => {
    render(
      <DetailHeader title="Gastos" origin="hoje" onBack={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /Voltar para Hoje/i })).toBeTruthy();
    expect(screen.getByText("← Hoje")).toBeTruthy();
  });

  it("exibe botão 'Voltar para Plano' quando origin=plano", () => {
    render(
      <DetailHeader title="Metas" origin="plano" onBack={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /Voltar para Plano/i })).toBeTruthy();
    expect(screen.getByText("← Plano")).toBeTruthy();
  });

  it("chama onBack ao clicar no botão de retorno", () => {
    const onBack = mock(() => {});
    render(
      <DetailHeader title="Crédito" origin="hoje" onBack={onBack} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Voltar para Hoje/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("não renderiza descrição quando omitida", () => {
    const { container } = render(
      <DetailHeader title="Simulação" origin="plano" onBack={() => {}} />,
    );
    const ps = container.querySelectorAll("p");
    expect(ps).toHaveLength(1);
  });

  it("data-testid está presente", () => {
    const { container } = render(
      <DetailHeader title="Investimentos" origin="hoje" onBack={() => {}} />,
    );
    expect(container.querySelector("[data-testid='detail-header']")).toBeTruthy();
  });
});
