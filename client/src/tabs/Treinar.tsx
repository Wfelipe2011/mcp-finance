import { useState, useEffect } from "react";
import { fetchDeviations, submitFeedback, requestRetrain } from "../api/client.ts";
import type { ForecastDeviation, FeedbackItem } from "../api/types.ts";

const CORRECTION_TAGS = [
  'Viagem',
  'Evento especial',
  'Mudança de hábito',
  'Outra situação atípica',
];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function Treinar() {
  const now = new Date();
  // Default para o próximo mês, pois forecast_predictions só tem meses futuros
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [year, setYear] = useState(nextMonth.getFullYear());
  const [month, setMonth] = useState(nextMonth.getMonth() + 1);
  const [deviations, setDeviations] = useState<ForecastDeviation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<number, { rating: 'up' | 'down'; tag?: string }>>({});
  const [openTagFor, setOpenTagFor] = useState<number | null>(null);
  const [retrainLoading, setRetrainLoading] = useState(false);
  const [retrainMessage, setRetrainMessage] = useState<string | null>(null);
  const [retrainError, setRetrainError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setDeviations([]);
    fetchDeviations(year, month)
      .then(data => setDeviations(data))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [year, month]);

  const ratedCount = Object.keys(ratings).length;

  async function handleRating(predictionId: number, rating: 'up' | 'down', tag?: string) {
    const newRatings = { ...ratings, [predictionId]: { rating, tag } };
    setRatings(newRatings);

    if (openTagFor === predictionId) setOpenTagFor(null);

    const items: FeedbackItem[] = [{ prediction_id: predictionId, rating, correction_tag: tag ?? null }];
    try {
      await submitFeedback(items);
    } catch (e) {
      console.error("Erro ao salvar feedback:", e);
    }
  }

  async function handleRetrain() {
    setRetrainLoading(true);
    setRetrainMessage(null);
    setRetrainError(null);
    try {
      await requestRetrain();
      setRetrainMessage("Modelo em re-treino. Os resultados aparecerão no próximo ciclo de previsão.");
    } catch (e) {
      setRetrainError((e as Error).message);
    } finally {
      setRetrainLoading(false);
    }
  }

  // anos disponíveis: próximo ano até 3 anos atrás
  const maxYear = nextMonth.getFullYear();
  const years = [maxYear + 1, maxYear, maxYear - 1, maxYear - 2];

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>
        🧠 Treinar Modelo
      </h2>

      {/* Seletor mês/ano */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i + 1} value={i + 1}>{name}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          style={{ width: '100px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Lista de desvios */}
      {loading && <p style={{ color: '#666' }}>Carregando...</p>}
      {error && <p style={{ color: 'red' }}>Erro: {error}</p>}
      {!loading && !error && deviations.length === 0 && (
        <p style={{ color: '#666' }}>Nenhum desvio encontrado para este período.</p>
      )}
      {deviations.map(dev => {
        const r = ratings[dev.prediction_id];
        const isUp = r?.rating === 'up';
        const isDown = r?.rating === 'down';
        const devPct = dev.deviation_pct;
        const devSign = devPct >= 0 ? '+' : '';

        return (
          <div key={dev.prediction_id} style={{
            border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px',
            marginBottom: '8px', background: '#fafafa'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong style={{ fontSize: '0.95rem' }}>{dev.category_pt}</strong>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>{dev.group_pt}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                <div>Previsto: R$ {dev.predicted_amount.toFixed(2)}</div>
                <div>Real: R$ {dev.actual_amount.toFixed(2)}</div>
                <div style={{ color: devPct > 20 ? '#c62828' : devPct < -20 ? '#2e7d32' : '#555' }}>
                  Desvio: {devSign}{devPct.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Botões de rating */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
              <button
                onClick={() => void handleRating(dev.prediction_id, 'up')}
                style={{
                  padding: '4px 12px', borderRadius: '4px', border: '1px solid #ccc',
                  background: isUp ? '#c8e6c9' : '#fff', cursor: 'pointer', fontSize: '1.1rem'
                }}
                title="Previsão correta"
              >👍</button>
              <button
                onClick={() => {
                  if (isDown && openTagFor === dev.prediction_id) {
                    setOpenTagFor(null);
                  } else {
                    setOpenTagFor(dev.prediction_id);
                  }
                  if (!isDown) {
                    setRatings(prev => ({ ...prev, [dev.prediction_id]: { rating: 'down' } }));
                  }
                }}
                style={{
                  padding: '4px 12px', borderRadius: '4px', border: '1px solid #ccc',
                  background: isDown ? '#ffcdd2' : '#fff', cursor: 'pointer', fontSize: '1.1rem'
                }}
                title="Previsão incorreta"
              >👎</button>
              {isDown && r && (
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                  {r.tag ?? 'sem motivo'}
                </span>
              )}
            </div>

            {/* Dropdown de motivo para 👎 */}
            {openTagFor === dev.prediction_id && (
              <div style={{ marginTop: '8px' }}>
                <select
                  value={r?.tag ?? ''}
                  onChange={e => {
                    const tag = e.target.value || undefined;
                    void handleRating(dev.prediction_id, 'down', tag);
                  }}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">Selecione o motivo (opcional)</option>
                  {CORRECTION_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
          </div>
        );
      })}

      {/* Botão Re-treinar */}
      <div style={{ marginTop: '24px', borderTop: '1px solid #e0e0e0', paddingTop: '16px' }}>
        <button
          onClick={() => void handleRetrain()}
          disabled={ratedCount < 3 || retrainLoading}
          title={ratedCount < 3 ? `Avalie pelo menos 3 categorias para re-treinar (${ratedCount}/3)` : 'Re-treinar o modelo com seu feedback'}
          style={{
            width: '100%', padding: '12px', borderRadius: '8px',
            background: ratedCount >= 3 ? '#1976d2' : '#bdbdbd',
            color: '#fff', border: 'none', cursor: ratedCount >= 3 ? 'pointer' : 'not-allowed',
            fontSize: '1rem', fontWeight: 600
          }}
        >
          {retrainLoading ? 'Solicitando re-treino...' : 'Re-treinar Modelo'}
        </button>
        {ratedCount < 3 && (
          <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px', textAlign: 'center' }}>
            Avalie pelo menos 3 categorias para re-treinar ({ratedCount}/3)
          </p>
        )}
        {retrainMessage && (
          <div style={{ marginTop: '8px', padding: '8px', background: '#e8f5e9', borderRadius: '4px', color: '#2e7d32' }}>
            {retrainMessage}
          </div>
        )}
        {retrainError && (
          <div style={{ marginTop: '8px', padding: '8px', background: '#ffebee', borderRadius: '4px', color: '#c62828' }}>
            {retrainError}
          </div>
        )}
      </div>
    </div>
  );
}
