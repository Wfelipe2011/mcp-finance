import { useState, useEffect, useRef } from "react";
import { fetchGoals, createGoal, updateGoal, deleteGoal } from "../api/client.ts";
import type { Goal, GoalType } from "../api/types.ts";
import { formatBRL } from "../utils/format.ts";

const CATEGORY_GROUPS = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Saúde",
  "Educação",
  "Lazer",
  "Vestuário",
  "Serviços",
  "Outros",
];

function formatDateLabel(value: string): string {
  const [datePart = value] = value.split("T");
  const [year, month, day] = datePart.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function GoalCard({
  goal,
  onUpdate,
  onDelete,
}: {
  goal: Goal;
  onUpdate: (id: number, data: Partial<Pick<Goal, "current_amount" | "status" | "name" | "notes" | "deadline" | "target_amount">>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [editingAmount, setEditingAmount] = useState(false);
  const [newAmount, setNewAmount] = useState<string>(String(goal.current_amount));
  const [confirmAction, setConfirmAction] = useState<"concluir" | "abandonar" | null>(null);
  const [loading, setLoading] = useState(false);

  const pct = Math.min(Number(goal.progress_ratio) * 100, 100);
  const isSpending = goal.goal_type === "spending";
  const progressExceeds = Number(goal.progress_ratio) > 0.8;

  const badgeClass = isSpending ? "badge badge-warning" : "badge badge-success";
  const progressColor = isSpending && progressExceeds ? "progress-error" : isSpending ? "progress-warning" : "progress-success";

  async function handleAmountSave() {
    const val = parseFloat(newAmount);
    if (isNaN(val) || val < 0) return;
    setLoading(true);
    await onUpdate(goal.id, { current_amount: val });
    setEditingAmount(false);
    setLoading(false);
  }

  async function handleStatusChange(status: "achieved" | "abandoned") {
    setLoading(true);
    await onUpdate(goal.id, { status });
    setConfirmAction(null);
    setLoading(false);
  }

  async function handleDelete() {
    setLoading(true);
    await onDelete(goal.id);
    setLoading(false);
  }

  return (
    <div className="card shadow-sm border" style={{ border: "1px solid var(--color-border-hairline)", backgroundColor: "var(--color-surface-card)" }}>
      <div className="card-body p-4">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{goal.name}</h3>
            {goal.category_group && (
              <p className="text-xs opacity-60 mt-0.5">{goal.category_group}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={badgeClass} style={{ fontSize: "0.65rem" }}>
              {isSpending ? "Controle de gasto" : "Poupança"}
            </span>
            {goal.is_overdue && (
              <span className="badge badge-error" style={{ fontSize: "0.65rem" }}>
                Vencida
              </span>
            )}
          </div>
        </div>

        {/* Prazo e alerta */}
        {goal.deadline && (
          <p className={`text-xs mt-1 ${goal.is_overdue ? "text-error font-semibold" : "opacity-60"}`}>
            {goal.is_overdue
              ? `Vencida em ${formatDateLabel(goal.deadline)}`
              : `Prazo: ${formatDateLabel(goal.deadline)}${goal.days_remaining !== null ? ` (${goal.days_remaining} dias)` : ""}`}
          </p>
        )}

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs opacity-70 mb-1">
            <span>{pct.toFixed(1)}%</span>
            <span>
              {isSpending
                ? `teto: ${formatBRL(goal.target_amount)}`
                : `${formatBRL(goal.current_amount)} / ${formatBRL(goal.target_amount)}`}
            </span>
          </div>
          <progress
            className={`progress w-full ${progressColor}`}
            value={pct}
            max={100}
          />
        </div>

        {/* Notas */}
        {goal.notes && (
          <p className="text-xs opacity-60 mt-2 italic">{goal.notes}</p>
        )}

        {/* Ações */}
        <div className="flex flex-wrap gap-2 mt-3">
          {!isSpending && (
            <>
              {editingAmount ? (
                <div className="flex gap-1 items-center">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="input input-bordered input-xs w-28"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAmountSave()}
                    autoFocus
                  />
                  <button className="btn btn-xs btn-primary" onClick={handleAmountSave} disabled={loading}>
                    OK
                  </button>
                  <button className="btn btn-xs btn-ghost" onClick={() => setEditingAmount(false)}>
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-xs btn-outline"
                  onClick={() => { setNewAmount(String(goal.current_amount)); setEditingAmount(true); }}
                  disabled={loading}
                >
                  Atualizar
                </button>
              )}
            </>
          )}

          {confirmAction ? (
            <div className="flex gap-1 items-center">
              <span className="text-xs">Confirmar?</span>
              <button
                className={`btn btn-xs ${confirmAction === "concluir" ? "btn-success" : "btn-error"}`}
                onClick={() => confirmAction === "concluir" ? handleStatusChange("achieved") : handleDelete()}
                disabled={loading}
              >
                Sim
              </button>
              <button className="btn btn-xs btn-ghost" onClick={() => setConfirmAction(null)}>Não</button>
            </div>
          ) : (
            <>
              <button
                className="btn btn-xs btn-outline btn-success"
                onClick={() => setConfirmAction("concluir")}
                disabled={loading}
              >
                Concluir
              </button>
              <button
                className="btn btn-xs btn-outline btn-error"
                onClick={() => setConfirmAction("abandonar")}
                disabled={loading}
              >
                Abandonar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface NovaMetaForm {
  name: string;
  goal_type: GoalType;
  target_amount: string;
  deadline: string;
  category_group: string;
  notes: string;
}

function NovaMetaModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: NovaMetaForm) => Promise<void>;
}) {
  const [form, setForm] = useState<NovaMetaForm>({
    name: "",
    goal_type: "saving",
    target_amount: "",
    deadline: "",
    category_group: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) { setError("Nome é obrigatório"); return; }
    const amount = parseFloat(form.target_amount);
    if (isNaN(amount) || amount <= 0) { setError("Valor alvo deve ser maior que zero"); return; }
    if (form.goal_type === "spending" && !form.category_group.trim()) {
      setError("Categoria é obrigatória para metas de controle de gasto");
      return;
    }

    setLoading(true);
    try {
      await onCreate(form);
      setForm({ name: "", goal_type: "saving", target_amount: "", deadline: "", category_group: "", notes: "" });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar meta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose}>
      <div className="modal-box max-w-sm">
        <h3 className="font-bold text-lg mb-4">Nova Meta</h3>
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div>
            <label className="label label-text text-xs">Nome</label>
            <input
              type="text"
              className="input input-bordered w-full input-sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="ex: Viagem para o exterior"
              required
            />
          </div>

          <div>
            <label className="label label-text text-xs">Tipo</label>
            <select
              className="select select-bordered w-full select-sm"
              value={form.goal_type}
              onChange={(e) => setForm((f) => ({ ...f, goal_type: e.target.value as GoalType }))}
            >
              <option value="saving">Poupança (guardar dinheiro)</option>
              <option value="spending">Controle de gasto (teto por categoria)</option>
            </select>
          </div>

          <div>
            <label className="label label-text text-xs">Valor alvo (R$)</label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              className="input input-bordered w-full input-sm"
              value={form.target_amount}
              onChange={(e) => setForm((f) => ({ ...f, target_amount: e.target.value }))}
              placeholder="5000.00"
              required
            />
          </div>

          {form.goal_type === "spending" && (
            <div>
              <label className="label label-text text-xs">Categoria</label>
              <select
                className="select select-bordered w-full select-sm"
                value={form.category_group}
                onChange={(e) => setForm((f) => ({ ...f, category_group: e.target.value }))}
                required
              >
                <option value="">Selecione...</option>
                {CATEGORY_GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label label-text text-xs">Prazo (opcional)</label>
            <input
              type="date"
              className="input input-bordered w-full input-sm"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            />
          </div>

          <div>
            <label className="label label-text text-xs">Notas (opcional)</label>
            <textarea
              className="textarea textarea-bordered w-full textarea-sm"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Observações..."
            />
          </div>

          {error && <p className="text-error text-xs">{error}</p>}

          <div className="modal-action mt-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-xs" /> : "Criar Meta"}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>fechar</button>
      </form>
    </dialog>
  );
}

export function Metas() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGoals();
      setGoals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar metas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleCreate(form: NovaMetaForm) {
    await createGoal({
      name: form.name.trim(),
      goal_type: form.goal_type,
      target_amount: parseFloat(form.target_amount),
      category_group: form.goal_type === "spending" ? form.category_group.trim() : undefined,
      deadline: form.deadline.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
    await load();
  }

  async function handleUpdate(id: number, data: Partial<Pick<Goal, "current_amount" | "status" | "name" | "notes" | "deadline" | "target_amount">>) {
    await updateGoal(id, data);
    await load();
  }

  async function handleDelete(id: number) {
    await deleteGoal(id);
    await load();
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">Metas Financeiras</h2>
          <p className="text-xs opacity-60">
            {goals.length === 0 ? "Nenhuma meta ativa" : `${goals.length} meta${goals.length !== 1 ? "s" : ""} ativa${goals.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
          + Nova Meta
        </button>
      </div>

      {/* Estado de carregamento */}
      {loading && (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-md" />
        </div>
      )}

      {/* Erro */}
      {!loading && error && (
        <div className="alert alert-error text-sm">
          <span>{error}</span>
          <button className="btn btn-xs btn-ghost" onClick={() => void load()}>Tentar novamente</button>
        </div>
      )}

      {/* Lista de metas */}
      {!loading && !error && goals.length === 0 && (
        <div className="text-center py-10 opacity-50">
          <p className="text-3xl mb-2">🎯</p>
          <p className="text-sm">Você ainda não tem metas ativas.</p>
          <p className="text-xs mt-1">Crie uma meta para acompanhar seu progresso financeiro.</p>
        </div>
      )}

      {!loading && !error && goals.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal de criação */}
      <NovaMetaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
