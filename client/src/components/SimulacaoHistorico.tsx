import { useState } from "react";
import type { Simulation, SimulationWithDetails } from "../api/types.ts";
import { closeSimulation, getSimulationById } from "../api/client.ts";
import { SimulacaoResultado } from "./SimulacaoResultado.tsx";

interface Props {
  simulations: Simulation[];
  onReopen: (sim: SimulationWithDetails) => void;
  onRefresh: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  open: "badge-success",
  closed: "badge-neutral",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Aberta",
  closed: "Encerrada",
};

const MONTH_NAMES: Record<number, string> = {
  1: "Jan", 2: "Fev", 3: "Mar", 4: "Abr",
  5: "Mai", 6: "Jun", 7: "Jul", 8: "Ago",
  9: "Set", 10: "Out", 11: "Nov", 12: "Dez",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth() + 1]} ${d.getFullYear()}`;
}

export function SimulacaoHistorico({ simulations, onReopen, onRefresh }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<SimulationWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState<string | null>(null);

  async function handleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(id);
    setLoading(true);
    try {
      const d = await getSimulationById(id);
      setDetail(d);
    } finally {
      setLoading(false);
    }
  }

  async function handleClose(id: string) {
    setClosing(id);
    try {
      await closeSimulation(id);
      onRefresh();
    } finally {
      setClosing(null);
    }
  }

  async function handleReopen(id: string) {
    setLoading(true);
    try {
      const d = await getSimulationById(id);
      onReopen(d);
    } finally {
      setLoading(false);
    }
  }

  if (simulations.length === 0) {
    return (
      <div className="text-center py-12 opacity-60">
        <p className="text-lg">Nenhuma simulação salva ainda.</p>
        <p className="text-sm mt-1">Crie sua primeira simulação acima.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {simulations.map((sim) => (
        <div key={sim.id} className="collapse collapse-arrow bg-base-200 rounded-box">
          <input
            type="checkbox"
            checked={expanded === sim.id}
            onChange={() => void handleExpand(sim.id)}
          />
          <div className="collapse-title flex items-center gap-3 pe-10">
            <span className={`badge ${STATUS_BADGE[sim.status] ?? "badge-neutral"}`}>
              {STATUS_LABEL[sim.status] ?? sim.status}
            </span>
            <span className="font-semibold flex-1">{sim.name}</span>
            <span className="text-xs opacity-60">
              {sim.horizon_months}m · {formatDate(sim.created_at)}
            </span>
          </div>

          <div className="collapse-content space-y-4">
            {expanded === sim.id && loading && !detail && (
              <div className="loading loading-spinner loading-sm" />
            )}

            {expanded === sim.id && detail && detail.id === sim.id && (
              <>
                <SimulacaoResultado
                  months={detail.months}
                  llmMessage={detail.llm_message}
                />

                <div className="flex gap-2 pt-2">
                  {sim.status === "open" && (
                    <button
                      className="btn btn-sm btn-outline btn-error"
                      disabled={closing === sim.id}
                      onClick={() => void handleClose(sim.id)}
                    >
                      {closing === sim.id ? <span className="loading loading-spinner loading-xs" /> : "Encerrar"}
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-outline btn-primary"
                    onClick={() => void handleReopen(sim.id)}
                  >
                    Reabrir no Wizard
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
