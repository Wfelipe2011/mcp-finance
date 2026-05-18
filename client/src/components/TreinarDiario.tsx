import { useState, useEffect, useCallback } from "react";
import {
  Box, Paper, Typography, Chip, Button,
  CircularProgress, Alert,
} from "@mui/material";
import {
  fetchModelVersions, fetchTestResults, activateModelVersion,
  deleteModelFile, fetchCategoryExclusions, toggleCategoryExclusion,
  addDailyExclusion, requestDailyTrain,
} from "../api/client.ts";
import type { ModelVersion, DailyTestResult, CategoryExclusion } from "../api/types.ts";

const CORRECTION_TAGS = ["Viagem", "Evento especial", "Mudança de hábito", "Outra situação atípica"];

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function deviationColor(pct: number): string {
  const abs = Math.abs(pct);
  if (abs < 15) return "var(--color-success, #2e7d32)";
  if (abs < 30) return "#ed6c02";
  return "#d32f2f";
}

export default function TreinarDiario() {
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [categories, setCategories] = useState<CategoryExclusion[]>([]);
  const [testResults, setTestResults] = useState<DailyTestResult[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trainLoading, setTrainLoading] = useState(false);
  const [trainMsg, setTrainMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openTagFor, setOpenTagFor] = useState<string | null>(null);

  const productionVersion = versions.find(v => v.status === "production");
  const latestVersion = versions[0] ?? null;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [v, c] = await Promise.all([
        fetchModelVersions(),
        fetchCategoryExclusions(),
      ]);
      setVersions(v);
      setCategories(c);
      const targetVersion = v.find(x => x.status === "production") ?? v[0];
      if (targetVersion) {
        setSelectedVersion(targetVersion.version_name);
        const results = await fetchTestResults(targetVersion.version_name);
        setTestResults(results);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  async function handleTrain() {
    setTrainLoading(true);
    setTrainMsg(null);
    try {
      const result = await requestDailyTrain();
      setTrainMsg(`Treino enfileirado: ${result.version_name}. O resultado aparecerá em alguns minutos.`);
      setTimeout(() => void loadData(), 5000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTrainLoading(false);
    }
  }

  async function handleActivate(versionName: string) {
    setActionLoading(`activate-${versionName}`);
    try {
      await activateModelVersion(versionName);
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteFile(versionName: string) {
    setActionLoading(`delete-${versionName}`);
    try {
      await deleteModelFile(versionName);
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleCategory(categoryPt: string, excluded: boolean) {
    setCategories(prev => prev.map(c =>
      c.category_pt === categoryPt ? { ...c, excluded } : c
    ));
    try {
      await toggleCategoryExclusion(categoryPt, excluded);
    } catch (e) {
      setError((e as Error).message);
      await loadData();
    }
  }

  async function handleExcludeRow(result: DailyTestResult, tag?: string) {
    try {
      await addDailyExclusion(result.transaction_date, result.category_pt, tag);
      setTestResults(prev => prev.filter(
        r => !(r.transaction_date === result.transaction_date && r.category_pt === result.category_pt)
      ));
    } catch (e) {
      setError((e as Error).message);
    }
    setOpenTagFor(null);
  }

  async function loadTestResults(versionName: string) {
    setSelectedVersion(versionName);
    try {
      const results = await fetchTestResults(versionName);
      setTestResults(results);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ py: "var(--space-md)", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      )}
      {trainMsg && (
        <Alert severity="success" onClose={() => setTrainMsg(null)}>{trainMsg}</Alert>
      )}

      {/* Banner de status do modelo atual */}
      <Paper elevation={0} sx={{
        p: "var(--space-md)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-hairline)",
        bgcolor: "var(--color-surface-card)",
      }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Modelo em produção
        </Typography>
        {productionVersion ? (
          <>
            <Typography variant="body1" fontWeight={600}>{productionVersion.version_name}</Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                MAE: {productionVersion.mae != null ? productionVersion.mae.toFixed(2) : "—"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                MAPE: {productionVersion.mape != null ? (productionVersion.mape * 100).toFixed(1) + "%" : "—"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Acurácia: {productionVersion.accuracy_pct != null
                  ? (productionVersion.accuracy_pct * 100).toFixed(0) + "%"
                  : "—"}
              </Typography>
            </Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">Nenhum modelo ativo</Typography>
        )}

        <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => void handleTrain()}
            disabled={trainLoading}
          >
            {trainLoading ? "⏳ " : ""}{latestVersion ? "Re-treinar" : "Iniciar treinamento"}
          </Button>
        </Box>
      </Paper>

      {/* Lista de versões */}
      {versions.length > 0 && (
        <Paper elevation={0} sx={{
          p: "var(--space-md)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-hairline)",
          bgcolor: "var(--color-surface-card)",
        }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Versões do modelo
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {versions.map(v => (
              <Box key={v.version_name} sx={{
                display: "flex", alignItems: "center",
                gap: 1, flexWrap: "wrap", py: 0.5,
              }}>
                <Chip
                  size="small"
                  label={v.status}
                  sx={{
                    background: v.status === "production"
                      ? "color-mix(in srgb, #2e7d32 18%, transparent)"
                      : v.status === "staging"
                        ? "color-mix(in srgb, #ed6c02 18%, transparent)"
                        : undefined,
                    color: v.status === "production"
                      ? "#2e7d32"
                      : v.status === "staging"
                        ? "#ed6c02"
                        : undefined,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{ flex: 1, cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                  onClick={() => void loadTestResults(v.version_name)}
                >
                  {v.version_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatBytes(v.file_size_bytes)}
                </Typography>
                {v.accuracy_pct != null && (
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{
                      color: v.accuracy_pct >= 0.7
                        ? "var(--color-success, #2e7d32)"
                        : v.accuracy_pct >= 0.5
                          ? "#ed6c02"
                          : "#d32f2f",
                    }}
                  >
                    {(v.accuracy_pct * 100).toFixed(0)}% acertos
                  </Typography>
                )}
                {v.status !== "production" && (
                  <>
                    {v.status === "staging" && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => void handleActivate(v.version_name)}
                        disabled={actionLoading === `activate-${v.version_name}`}
                      >
                        Ativar
                      </Button>
                    )}
                    {v.file_path && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => void handleDeleteFile(v.version_name)}
                        disabled={actionLoading === `delete-${v.version_name}`}
                        sx={{ color: "#d32f2f", borderColor: "#d32f2f" }}
                      >
                        🗑️ .pkl
                      </Button>
                    )}
                  </>
                )}
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Categorias excluídas */}
      <Paper elevation={0} sx={{
        p: "var(--space-md)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-hairline)",
        bgcolor: "var(--color-surface-card)",
      }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Categorias excluídas do treinamento
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
          Categorias ativadas abaixo serão ignoradas no próximo treinamento.
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {categories.map(cat => (
            <label
              key={cat.category_pt}
              style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={cat.excluded}
                onChange={(e) => void handleToggleCategory(cat.category_pt, e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <Typography variant="body2">{cat.category_pt}</Typography>
            </label>
          ))}
        </Box>
      </Paper>

      {/* Resultados do conjunto de teste */}
      {testResults.length > 0 && (
        <Paper elevation={0} sx={{
          p: "var(--space-md)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-hairline)",
          bgcolor: "var(--color-surface-card)",
        }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Conjunto de teste — {selectedVersion}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
            Ordenado por maior desvio. Clique em 👎 para excluir do próximo treino.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {testResults.slice(0, 30).map((r, i) => {
              const key = `${r.transaction_date}-${r.category_pt}`;
              return (
                <Box key={i} sx={{ py: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 90 }}>
                      {r.transaction_date.substring(0, 10)}
                    </Typography>
                    <Typography variant="caption" sx={{ flex: 1 }}>
                      {r.category_pt}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      R$ {r.actual_amount.toFixed(2).replace(".", ",")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      →
                    </Typography>
                    <Typography variant="caption">
                      R$ {r.predicted_amount.toFixed(2).replace(".", ",")}
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      sx={{ color: deviationColor(r.deviation_pct) }}
                    >
                      ({r.deviation_pct > 0 ? "+" : ""}{r.deviation_pct.toFixed(1)}%)
                    </Typography>
                    <Button
                      size="small"
                      title="Marcar como atípico"
                      onClick={() => setOpenTagFor(openTagFor === key ? null : key)}
                      sx={{ minWidth: 0, px: 0.5 }}
                    >
                      👎
                    </Button>
                  </Box>
                  {openTagFor === key && (
                    <Box sx={{ pl: 1, mt: 0.5, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      {CORRECTION_TAGS.map(tag => (
                        <button
                          key={tag}
                          onClick={() => void handleExcludeRow(r, tag)}
                          style={{
                            borderRadius: "var(--radius-pill)",
                            border: "1px solid var(--color-border-hairline)",
                            background: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
                            color: "var(--color-primary)",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            cursor: "pointer",
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                      <button
                        onClick={() => void handleExcludeRow(r)}
                        style={{
                          borderRadius: "var(--radius-pill)",
                          border: "1px solid var(--color-border-hairline)",
                          background: "color-mix(in srgb, var(--color-surface-strong) 65%, transparent)",
                          color: "var(--color-text-body)",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          cursor: "pointer",
                        }}
                      >
                        Sem tag
                      </button>
                    </Box>
                  )}
                  {i < testResults.length - 1 && (
                    <Box sx={{ borderBottom: "1px solid var(--color-border-hairline)", mt: 0.5 }} />
                  )}
                </Box>
              );
            })}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
