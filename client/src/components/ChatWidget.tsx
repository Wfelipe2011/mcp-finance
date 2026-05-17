import { useState, useRef, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  CircularProgress,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { postChatMessage } from "../api/client.ts";
import type { ChatMessage } from "../api/types.ts";

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Olá! Sou seu assistente financeiro. Como posso te ajudar hoje? 💬",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [welcomed, setWelcomed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open && !welcomed) {
      setMessages([WELCOME_MESSAGE]);
      setWelcomed(true);
    }
  }, [open, welcomed]);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open]);

  const handleToggle = () => setOpen((prev) => !prev);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const history = messages.filter((m) => m.role !== "assistant" || m !== WELCOME_MESSAGE);

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await postChatMessage({
        message: text,
        history: history.slice(-10),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Não consegui obter uma resposta. ${errorMsg}. Tente novamente.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <>
      {open && (
        <Paper
          elevation={12}
          sx={{
            position: "fixed",
            bottom: 80,
            right: 16,
            width: { xs: "calc(100vw - 32px)", sm: 360 },
            maxWidth: 360,
            height: 420,
            maxHeight: "calc(100vh - 120px)",
            display: "flex",
            flexDirection: "column",
            borderRadius: 3,
            overflow: "hidden",
            zIndex: 1200,
            border: "1px solid rgba(128,128,128,0.25)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18)",
          }}
        >
          {/* Cabeçalho */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1.5,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              flexShrink: 0,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span>💬</span>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Assistente
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={handleToggle}
              sx={{ color: "primary.contrastText" }}
              aria-label="Fechar chat"
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Lista de mensagens */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              px: 1.5,
              py: 1,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            {messages.map((msg, i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <Box
                  sx={{
                    maxWidth: "80%",
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: msg.role === "user" ? "primary.main" : "action.hover",
                    color: msg.role === "user" ? "primary.contrastText" : "text.primary",
                    border: msg.role === "assistant" ? "1px solid rgba(128,128,128,0.15)" : "none",
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {msg.content}
                  </Typography>
                </Box>
              </Box>
            ))}

            {loading && (
              <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: "action.hover",
                    border: "1px solid rgba(128,128,128,0.15)",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <CircularProgress size={14} />
                  <Typography variant="body2" color="text.secondary">
                    Respondendo...
                  </Typography>
                </Box>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Box>

          {/* Campo de input */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 1,
              borderTop: "1px solid rgba(128,128,128,0.2)",
              flexShrink: 0,
            }}
          >
            <textarea
              rows={1}
              placeholder="Digite sua pergunta..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              style={{
                flex: 1,
                resize: "none",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(128,128,128,0.35)",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                backgroundColor: "transparent",
                color: "inherit",
              }}
            />
            <IconButton
              color="primary"
              onClick={() => void handleSend()}
              disabled={!input.trim() || loading}
              aria-label="Enviar mensagem"
            >
              <span style={{ fontSize: 18 }}>➤</span>
            </IconButton>
          </Box>
        </Paper>
      )}

      {/* Botão flutuante */}
      <IconButton
        onClick={handleToggle}
        aria-label={open ? "Fechar chat" : "Abrir chat"}
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 1201,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          width: 56,
          height: 56,
          "&:hover": { bgcolor: "primary.dark" },
          boxShadow: "0 4px 16px rgba(0,0,0,0.32), 0 1px 4px rgba(0,0,0,0.20)",
        }}
      >
        {open ? <CloseRoundedIcon /> : <span style={{ fontSize: 22 }}>💬</span>}
      </IconButton>
    </>
  );
}
