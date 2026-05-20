import { useState, useEffect } from "react";
import type { Simulation, SimulationWithDetails } from "../api/types.ts";
import { getSimulations } from "../api/client.ts";
import { SimulacaoForm } from "../components/SimulacaoForm.tsx";
import { SimulacaoHistorico } from "../components/SimulacaoHistorico.tsx";

type View = "historico" | "nova" | "reabrir";

export function Simulacao() {
  const [view, setView] = useState<View>("nova");
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [reopenData, setReopenData] = useState<SimulationWithDetails | null>(null);

  async function loadSimulations() {
    setLoadingList(true);
    try {
      const list = await getSimulations();
      setSimulations(list);
    } catch {
      // ignora — lista pode estar vazia
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    void loadSimulations();
  }, []);

  function handleSaved() {
    setView("historico");
    void loadSimulations();
  }

  function handleReopen(sim: SimulationWithDetails) {
    setReopenData(sim);
    setView("reabrir");
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Simulação Financeira</h1>
          <p className="text-sm opacity-60">Projete o impacto de novas compras e despesas no seu orçamento</p>
        </div>
        <div className="tabs tabs-boxed">
          <button
            className={`tab ${view === "nova" || view === "reabrir" ? "tab-active" : ""}`}
            onClick={() => {
              setReopenData(null);
              setView("nova");
            }}
          >
            Nova Simulação
          </button>
          <button
            className={`tab ${view === "historico" ? "tab-active" : ""}`}
            onClick={() => setView("historico")}
          >
            Histórico{simulations.length > 0 ? ` (${simulations.length})` : ""}
          </button>
        </div>
      </div>

      {(view === "nova" || view === "reabrir") && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title text-base">
              {view === "reabrir" && reopenData ? `Reabrir: ${reopenData.name}` : "Nova Simulação"}
            </h2>
            <SimulacaoForm
              key={view === "reabrir" && reopenData ? reopenData.id : "nova"}
              initialData={view === "reabrir" ? reopenData : null}
              onSaved={handleSaved}
              onCancel={() => setView("historico")}
            />
          </div>
        </div>
      )}

      {view === "historico" && (
        <div className="space-y-4">
          {loadingList ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : (
            <SimulacaoHistorico
              simulations={simulations}
              onReopen={handleReopen}
              onRefresh={() => void loadSimulations()}
            />
          )}
          <div className="flex justify-end">
            <button
              className="btn btn-primary"
              onClick={() => {
                setReopenData(null);
                setView("nova");
              }}
            >
              + Nova Simulação
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
