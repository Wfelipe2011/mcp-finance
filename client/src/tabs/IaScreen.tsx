import { useEffect, useRef, useState } from "react";
import { Previsao } from "./Previsao.tsx";
import DailyInsightsNavigator from "../components/DailyInsightsNavigator.tsx";
import { postChatMessage } from "../api/client.ts";
import type { ChatMessage } from "../api/types.ts";

const SUB_TABS = ["Insights", "Previsões"];

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

export default function IaScreen() {
  const [activeSubTab, setActiveSubTab] = useState(0);

  return (
    <div>
      <div
        role="tablist"
        style={{
          borderBottom: "1px solid var(--color-border-hairline)",
          marginBottom: "var(--space-md)",
          display: "flex",
        }}
      >
        {SUB_TABS.map((label, i) => (
          <button
            key={label}
            role="tab"
            aria-selected={activeSubTab === i}
            onClick={() => setActiveSubTab(i)}
            style={{
              flex: 1,
              padding: "8px 4px",
              background: "transparent",
              border: "none",
              borderBottom: activeSubTab === i
                ? "2px solid var(--color-primary)"
                : "2px solid transparent",
              color: activeSubTab === i ? "var(--color-primary)" : "var(--color-muted)",
              fontWeight: activeSubTab === i ? 700 : 500,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "color 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeSubTab === 0 && (
        <>
          <DailyInsightsNavigator />
          <ChatIaPanel />
        </>
      )}
      {activeSubTab === 1 && <Previsao />}
    </div>
  );
}
