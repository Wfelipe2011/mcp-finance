import React, { useEffect, useRef, useState } from "react";
import { Previsao } from "./Previsao.tsx";
import DailyInsightsNavigator from "../components/DailyInsightsNavigator.tsx";
import { fetchTransacoes, postChatMessage } from "../api/client.ts";
import type { ChatMessage, Transacao } from "../api/types.ts";
import { AnomaliasList } from "../components/AnomaliasList.tsx";

const ANOMALY_THRESHOLD = 0.6;
const ANOMALIAS_INITIAL_LIMIT = 5;

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Olá! Sou seu assistente financeiro. Como posso te ajudar hoje? 💬",
};

function ChatIaPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const history = messages.filter((message) => message.content !== WELCOME_MESSAGE.content);

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await postChatMessage({ message: text, history: history.slice(-10) });
      setMessages((prev) => [...prev, { role: "assistant", content: response.reply }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Não consegui obter uma resposta agora. ${message}. Tente novamente.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <section
      className="card"
      style={{
        marginTop: "var(--space-md)",
        border: "1px solid var(--color-border-hairline)",
        backgroundColor: "var(--color-surface-card)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "var(--space-sm) var(--space-md)",
          borderBottom: "1px solid var(--color-border-hairline)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-xs)",
        }}
      >
        <span aria-hidden>💬</span>
        <p style={{ margin: 0, fontWeight: 700, color: "var(--color-text-primary)" }}>Assistente financeiro</p>
      </div>

      <div
        style={{
          maxHeight: 360,
          overflowY: "auto",
          padding: "var(--space-sm)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-xs)",
        }}
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            style={{
              display: "flex",
              justifyContent: message.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "82%",
                padding: "8px 10px",
                borderRadius: "var(--radius-md)",
                backgroundColor: message.role === "user"
                  ? "var(--color-primary)"
                  : "var(--color-surface-elevated)",
                color: message.role === "user" ? "var(--color-on-primary)" : "var(--color-text-body)",
                border: message.role === "assistant" ? "1px solid var(--color-border-hairline)" : "none",
                whiteSpace: "pre-wrap",
                fontSize: "0.875rem",
                lineHeight: 1.45,
              }}
            >
              {message.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-xs)",
                padding: "8px 10px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-hairline)",
                backgroundColor: "var(--color-surface-elevated)",
                color: "var(--color-text-body)",
                fontSize: "0.875rem",
              }}
            >
              <span className="loading loading-spinner loading-sm" />
              Respondendo...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          padding: "var(--space-sm)",
          borderTop: "1px solid var(--color-border-hairline)",
          display: "flex",
          alignItems: "flex-end",
          gap: "var(--space-xs)",
        }}
      >
        <textarea
          className="textarea textarea-bordered"
          rows={1}
          placeholder="Digite sua pergunta..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={{
            flex: 1,
            resize: "none",
            minHeight: 42,
            backgroundColor: "var(--color-surface-elevated)",
            color: "var(--color-text-primary)",
            borderColor: "var(--color-border-hairline)",
          }}
        />
        <button
          type="button"
          className="btn"
          onClick={() => void handleSend()}
          disabled={!input.trim() || loading}
          aria-label="Enviar mensagem"
          style={{
            minHeight: 42,
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: "var(--color-primary)",
            color: "var(--color-on-primary)",
          }}
        >
          ➤
        </button>
      </div>
    </section>
  );
}

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: 0.9,
  fontWeight: 700,
  color: "var(--color-text-body)",
  margin: 0,
  marginBottom: "var(--space-sm)",
};

function AnomaliasSection() {
  const [anomalias, setAnomalias] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    fetchTransacoes(currentMonth, 100)
      .then(({ items }) => {
        const filtered = items
          .filter((t) => (t.anomaly_score ?? 0) > ANOMALY_THRESHOLD)
          .sort((a, b) => (b.anomaly_score ?? 0) - (a.anomaly_score ?? 0));
        setAnomalias(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentMonth]);

  if (loading) {
    return <div className="loading loading-spinner loading-sm" style={{ margin: "var(--space-sm) 0" }} />;
  }

  const visible = showAll ? anomalias : anomalias.slice(0, ANOMALIAS_INITIAL_LIMIT);

  return (
    <div>
      <AnomaliasList transacoes={visible} />
      {!showAll && anomalias.length > ANOMALIAS_INITIAL_LIMIT && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          style={{
            marginTop: "var(--space-sm)",
            background: "transparent",
            border: "1px solid var(--color-border-hairline)",
            borderRadius: "var(--radius-md)",
            padding: "4px var(--space-sm)",
            fontSize: "0.8rem",
            cursor: "pointer",
            color: "var(--color-text-primary)",
          }}
        >
          Ver mais ({anomalias.length - ANOMALIAS_INITIAL_LIMIT} restantes)
        </button>
      )}
    </div>
  );
}

export default function IaScreen() {
  return (
    <div className="mt-4 space-y-6">
      <section>
        <p style={sectionHeadingStyle}>✨ Análise do Mês</p>
        <DailyInsightsNavigator />
        <ChatIaPanel />
      </section>

      <section
        style={{
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-md)",
          border: "1px solid var(--color-border-hairline)",
          backgroundColor: "var(--color-surface-card)",
        }}
      >
        <p style={sectionHeadingStyle}>⚠️ Anomalias</p>
        <AnomaliasSection />
      </section>

      <section>
        <p style={sectionHeadingStyle}>📅 Previsões</p>
        <Previsao />
      </section>
    </div>
  );
}
