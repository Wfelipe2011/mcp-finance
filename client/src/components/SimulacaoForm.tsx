import { useState, useEffect, useRef, useCallback } from "react";
import type {
  SimulationItemPayload,
  SimulationMonth,
  Transacao,
  SimulationWithDetails,
} from "../api/types.ts";
import { calculateSimulation, createSimulation, fetchMeses, fetchTransacoes, updateSimulation } from "../api/client.ts";
import { SimulacaoResultado } from "./SimulacaoResultado.tsx";
import { formatBRL } from "../utils/format.ts";

interface Props {
  initialData?: SimulationWithDetails | null;
  onSaved: () => void;
  onCancel: () => void;
}

const STEP_LABELS = [
  "Nome e Horizonte",
  "Item Principal",
  "Revisão e Exclusões",
  "Projeção e Salvar",
];

type StepId = 0 | 1 | 2 | 3;

function buildEmptyItem(): SimulationItemPayload {
  return {
    item_type: "new_purchase",
    label: "",
    total_amount: null,
    installments: 12,
    monthly_amount: null,
    direction: "expense",
    is_exclusion: false,
  };
}

export function SimulacaoForm({ initialData, onSaved, onCancel }: Props) {
  const [step, setStep] = useState<StepId>(0);
  const [name, setName] = useState(initialData?.name ?? "");
  const [horizon, setHorizon] = useState(initialData?.horizon_months ?? 12);
  const [item, setItem] = useState<SimulationItemPayload>(
    initialData?.items?.find(i => i.item_type !== "exclusion") ?? buildEmptyItem(),
  );
  const [exclusions, setExclusions] = useState<string[]>(() => {
    if (!initialData) return [];
    return initialData.items
      .filter(i => i.is_exclusion)
      .flatMap(i => i.excluded_transaction_ids ?? []);
  });
  const [months, setMonths] = useState<SimulationMonth[]>(initialData?.months ?? []);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedLlm, setSavedLlm] = useState<string | null>(null);
  const [reviewMonth, setReviewMonth] = useState<string | null>(null);
  const [reviewTransactions, setReviewTransactions] = useState<Transacao[]>([]);
  const [loadingReview, setLoadingReview] = useState(false);
  const [reviewLoaded, setReviewLoaded] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildPayload = useCallback(() => {
    const items: SimulationItemPayload[] = [item];
    if (exclusions.length > 0) {
      items.push({
        item_type: "exclusion",
        label: "Exclusões manuais",
        is_exclusion: true,
        excluded_transaction_ids: exclusions,
      });
    }
    return { horizon_months: horizon, items, exclusions };
  }, [item, exclusions, horizon]);

  const runCalculate = useCallback(async () => {
    setCalculating(true);
    setError(null);
    try {
      const result = await calculateSimulation(buildPayload());
      setMonths(result.months);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCalculating(false);
    }
  }, [buildPayload]);

  // Recalcular ao avançar para step 3
  useEffect(() => {
    if (step === 3 && months.length === 0) {
      void runCalculate();
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce recalculate on step 2 (exclusion changes)
  useEffect(() => {
    if (step !== 2) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void runCalculate();
    }, 500);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [exclusions, step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step !== 2 || reviewLoaded) return;
    let cancelled = false;
    async function loadReviewTransactions() {
      setLoadingReview(true);
      try {
        const meses = await fetchMeses();
        const month = meses[0];
        if (!month) return;
        const response = await fetchTransacoes(month, 30, 0);
        if (!cancelled) {
          setReviewMonth(month);
          setReviewTransactions(response.items);
        }
      } catch {
        if (!cancelled) setReviewTransactions([]);
      } finally {
        if (!cancelled) {
          setReviewLoaded(true);
          setLoadingReview(false);
        }
      }
    }
    void loadReviewTransactions();
    return () => {
      cancelled = true;
    };
  }, [reviewLoaded, step]);

  function handleItemChange(field: keyof SimulationItemPayload, value: unknown) {
    setItem(prev => ({ ...prev, [field]: value }));
    setMonths([]); // precisa recalcular
  }

  function nextStep() {
    setStep(s => (s < 3 ? (s + 1) as StepId : s));
  }

  function prevStep() {
    setStep(s => (s > 0 ? (s - 1) as StepId : s));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = { name: name.trim(), ...buildPayload() };
      const saved = initialData
        ? await updateSimulation(initialData.id, payload)
        : await createSimulation(payload);
      setSavedLlm(saved.llm_message);
      setMonths(saved.months);
      setTimeout(() => onSaved(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const canProceedStep0 = name.trim().length > 0 && horizon >= 1 && horizon <= 24;
  const canProceedStep1 = item.label.trim().length > 0;
  const groupedTransactions = reviewTransactions.reduce<Record<string, Transacao[]>>((acc, transaction) => {
    const category = transaction.category_pt ?? "Sem categoria";
    acc[category] = [...(acc[category] ?? []), transaction];
    return acc;
  }, {});

  function toggleExclusion(transactionId: string) {
    setExclusions((current) => current.includes(transactionId)
      ? current.filter((id) => id !== transactionId)
      : [...current, transactionId]);
    setMonths([]);
  }

  return (
    <div className="space-y-6">
      {/* Steps indicator */}
      <ul className="steps steps-horizontal w-full text-xs">
        {STEP_LABELS.map((label, i) => (
          <li
            key={label}
            className={`step ${i <= step ? "step-primary" : ""}`}
          >
            {label}
          </li>
        ))}
      </ul>

      {/* Step 0: Nome e Horizonte */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Nome da simulação</span></label>
            <input
              className="input input-bordered"
              placeholder="Ex: Comprar notebook parcelado"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Horizonte de projeção</span>
              <span className="label-text-alt">{horizon} meses</span>
            </label>
            <input
              type="range"
              min={1}
              max={24}
              value={horizon}
              className="range range-primary"
              onChange={e => setHorizon(Number(e.target.value))}
            />
            <div className="flex justify-between text-xs opacity-60 mt-1">
              <span>1 mês</span><span>12 meses</span><span>24 meses</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Item Principal */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Tipo do item</span></label>
            <select
              className="select select-bordered"
              value={item.item_type}
              onChange={e => handleItemChange("item_type", e.target.value)}
            >
              <option value="new_purchase">Nova compra parcelada</option>
              <option value="recurring">Despesa recorrente</option>
              <option value="income_adjustment">Ajuste de receita</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Descrição</span></label>
            <input
              className="input input-bordered"
              placeholder="Ex: Notebook Dell, Plano de academia..."
              value={item.label}
              onChange={e => handleItemChange("label", e.target.value)}
            />
          </div>

          {item.item_type === "new_purchase" && (
            <>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Valor total (R$)</span></label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input input-bordered"
                  placeholder="3499.00"
                  value={item.total_amount ?? ""}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    const installments = item.installments ?? 1;
                    handleItemChange("total_amount", isNaN(v) ? null : v);
                    if (!isNaN(v) && installments > 0) {
                      handleItemChange("monthly_amount", Math.round((v / installments) * 100) / 100);
                    }
                  }}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Parcelas</span>
                  <span className="label-text-alt">{item.installments}x</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={item.installments ?? 12}
                  className="range range-secondary"
                  onChange={e => {
                    const installments = Number(e.target.value);
                    handleItemChange("installments", installments);
                    if (item.total_amount) {
                      handleItemChange("monthly_amount", Math.round((item.total_amount / installments) * 100) / 100);
                    }
                  }}
                />
                {item.monthly_amount && (
                  <p className="text-sm opacity-70 mt-1">
                    = R$ {item.monthly_amount.toFixed(2)}/mês
                  </p>
                )}
              </div>
            </>
          )}

          {(item.item_type === "recurring" || item.item_type === "income_adjustment") && (
            <>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Valor mensal (R$)</span></label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input input-bordered"
                  placeholder="150.00"
                  value={item.monthly_amount ?? ""}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    handleItemChange("monthly_amount", isNaN(v) ? null : v);
                  }}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Direção</span></label>
                <select
                  className="select select-bordered"
                  value={item.direction ?? "expense"}
                  onChange={e => handleItemChange("direction", e.target.value)}
                >
                  <option value="expense">Despesa (saída)</option>
                  <option value="income">Receita (entrada)</option>
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Revisão e Exclusões */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm opacity-70">
            Marque transações atípicas para remover da média histórica. O sistema recalcula automaticamente com 500ms de debounce.
          </p>
          {loadingReview && (
            <div className="flex items-center gap-2 text-sm opacity-60">
              <span className="loading loading-spinner loading-xs" />
              Carregando transações recentes...
            </div>
          )}
          {!loadingReview && reviewTransactions.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs opacity-60">Base de revisão: {reviewMonth}</p>
              {Object.entries(groupedTransactions).map(([category, transactions]) => (
                <div key={category} className="rounded-box border border-base-300 overflow-hidden">
                  <div className="bg-base-200 px-3 py-2 text-sm font-semibold">{category}</div>
                  <div className="divide-y divide-base-300">
                    {transactions.map((transaction) => (
                      <label key={transaction.transaction_id} className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={exclusions.includes(transaction.transaction_id)}
                          onChange={() => toggleExclusion(transaction.transaction_id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{transaction.description}</span>
                          <span className="block text-xs opacity-60">{transaction.owner_normalized}</span>
                        </span>
                        <span className="text-sm font-medium whitespace-nowrap">
                          {formatBRL(Math.abs(transaction.amount_signed))}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loadingReview && reviewTransactions.length === 0 && (
            <div className="alert alert-info text-sm">Nenhuma transação recente disponível para revisão.</div>
          )}
          {calculating && (
            <div className="flex items-center gap-2 text-sm opacity-60">
              <span className="loading loading-spinner loading-xs" />
              Recalculando...
            </div>
          )}
          {months.length > 0 && !calculating && (
            <div className="border border-base-300 rounded-box p-4">
              <p className="text-sm font-semibold mb-3">Prévia da projeção</p>
              <SimulacaoResultado months={months} />
            </div>
          )}
        </div>
      )}

      {/* Step 3: Projeção e Salvar */}
      {step === 3 && (
        <div className="space-y-4">
          {calculating && (
            <div className="flex items-center gap-2">
              <span className="loading loading-spinner" />
              <span>Calculando projeção...</span>
            </div>
          )}
          {!calculating && months.length > 0 && (
            <SimulacaoResultado months={months} llmMessage={savedLlm} />
          )}
          {error && (
            <div className="alert alert-error text-sm">{error}</div>
          )}
          {!saving && !savedLlm && (
            <button
              className="btn btn-primary w-full"
              disabled={saving || months.length === 0}
              onClick={() => void handleSave()}
            >
              Salvar simulação
            </button>
          )}
          {saving && (
            <div className="flex items-center gap-2 justify-center py-2">
              <span className="loading loading-spinner" />
              <span>Salvando e gerando análise IA...</span>
            </div>
          )}
          {savedLlm && (
            <div className="alert alert-success text-sm">
              ✓ Simulação salva com sucesso! Redirecionando para o histórico...
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button className="btn btn-ghost" onClick={step === 0 ? onCancel : prevStep}>
          {step === 0 ? "Cancelar" : "Voltar"}
        </button>
        {step < 3 && (
          <button
            className="btn btn-primary"
            disabled={
              (step === 0 && !canProceedStep0) ||
              (step === 1 && !canProceedStep1)
            }
            onClick={nextStep}
          >
            Próximo
          </button>
        )}
      </div>
    </div>
  );
}
