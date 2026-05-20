import { useState, useEffect } from "react";
import { MonthPicker } from "./components/MonthPicker.tsx";
import { LoginScreen } from "./components/LoginScreen.tsx";
import { ConfigDialog } from "./components/ConfigDialog.tsx";
import { Resumo } from "./tabs/Resumo.tsx";
import { Gastos } from "./tabs/Gastos.tsx";
import { ProximoMes } from "./tabs/ProximoMes.tsx";
import { Investimentos } from "./tabs/Investimentos.tsx";
import IaScreen from "./tabs/IaScreen.tsx";
import { fetchDigest, fetchMeses, triggerSync } from "./api/client.ts";
import type { Digest } from "./api/types.ts";
import type { AppColorMode } from "./theme.ts";

function isTokenValid(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const base64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

type TabId = "resumo" | "gastos" | "proximo-mes" | "investimentos" | "ia";

const NAV_ITEMS: { id: TabId; label: string; icon: string }[] = [
  { id: "resumo", label: "Resumo", icon: "🏠" },
  { id: "gastos", label: "Gastos", icon: "🧾" },
  { id: "proximo-mes", label: "Próx. Mês", icon: "📅" },
  { id: "investimentos", label: "Investimentos", icon: "📈" },
  { id: "ia", label: "IA", icon: "✨" },
];

export function App() {
  const [authToken, setAuthToken] = useState<string | null>(
    localStorage.getItem("authToken")
  );
  const [selectedMonth, setSelectedMonth] = useState(
    localStorage.getItem("selectedMonth") ?? ""
  );
  const [digest, setDigest] = useState<Digest | null>(null);
  const [meses, setMeses] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("resumo");
  const [colorMode, setColorMode] = useState<AppColorMode>(
    (localStorage.getItem("colorMode") as AppColorMode) ?? "light"
  );
  const [syncState, setSyncState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  void meses;

  const handleMonthChange = (month: string) => {
    localStorage.setItem("selectedMonth", month);
    setSelectedMonth(month);
  };

  const toggleColorMode = () => {
    const nextMode = colorMode === "light" ? "dark" : "light";
    setColorMode(nextMode);
    localStorage.setItem("colorMode", nextMode);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", colorMode === "light");
  }, [colorMode]);

  useEffect(() => {
    if (!selectedMonth) return;
    if (!authToken || !isTokenValid(authToken)) return;
    setDigest(null);
    fetchDigest(selectedMonth).then(setDigest).catch(() => setDigest(null));
  }, [selectedMonth, authToken]);

  useEffect(() => {
    const onUnauthorized = () => {
      setAuthToken(null);
      setDigest(null);
    };
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, []);

  async function handleSync() {
    setSyncState("loading");
    try {
      const summary = await triggerSync();
      const secs = (summary.durationMs / 1000).toFixed(1);
      setSyncMessage(`Sincronizado: ${summary.transactions} transações em ${secs}s`);
      setSyncState("success");
      setToastVisible(true);
      const newMeses = await fetchMeses();
      setMeses(newMeses);
      if (newMeses.length > 0 && !newMeses.includes(selectedMonth)) {
        handleMonthChange(newMeses[0]!);
      }
    } catch (err) {
      setSyncMessage(`Erro no sync: ${err instanceof Error ? err.message : String(err)}`);
      setSyncState("error");
      setToastVisible(true);
    } finally {
      setTimeout(() => {
        setSyncState("idle");
        setToastVisible(false);
      }, syncState === "error" ? 4000 : 3000);
    }
  }

  if (!authToken || !isTokenValid(authToken)) {
    return (
      <LoginScreen
        onLogin={(token) => {
          localStorage.setItem("authToken", token);
          setAuthToken(token);
        }}
      />
    );
  }

  function renderTab() {
    switch (activeTab) {
      case "resumo":
        return selectedMonth ? <Resumo month={selectedMonth} digest={digest} /> : null;
      case "gastos":
        return selectedMonth ? <Gastos month={selectedMonth} /> : null;
      case "proximo-mes":
        return <ProximoMes />;
      case "investimentos":
        return selectedMonth ? <Investimentos month={selectedMonth} /> : null;
      case "ia":
        return <IaScreen />;
      default:
        return null;
    }
  }

  return (
    <div className="drawer lg:drawer-open min-h-screen" style={{ backgroundColor: "var(--color-canvas)" }}>
      {/* Drawer toggle (mobile) */}
      <input id="main-drawer" type="checkbox" className="drawer-toggle" />

      {/* Drawer content */}
      <div className="drawer-content flex flex-col">
        {/* Header */}
        <header
          style={{
            padding: "var(--space-md)",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "var(--space-sm)",
            borderBottom: "1px solid var(--color-border-hairline)",
          }}
        >
          <div>
            {/* Hamburger (mobile) */}
            <label
              htmlFor="main-drawer"
              className="btn btn-ghost btn-sm lg:hidden"
              aria-label="Abrir menu"
              style={{ marginBottom: "var(--space-xs)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </label>
            <p
              style={{
                fontWeight: 700,
                fontSize: "1.1rem",
                color: "var(--color-text-primary)",
                margin: 0,
              }}
            >
              💰 Finanças Familiar
            </p>
            <div style={{ marginTop: "var(--space-xs)" }}>
              <MonthPicker value={selectedMonth} onChange={handleMonthChange} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              type="button"
              onClick={() => void handleSync()}
              disabled={syncState === "loading"}
              title="Sincronizar dados"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "1px solid var(--color-border-hairline)",
                background: "var(--color-surface-card)",
                color: syncState === "success" ? "var(--color-trading-up)" : syncState === "error" ? "var(--color-trading-down)" : "var(--color-text-primary)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: syncState === "loading" ? "not-allowed" : "pointer",
                opacity: syncState === "loading" ? 0.55 : 1,
                fontSize: 16,
              }}
            >
              {syncState === "loading" ? (
                <span className="loading loading-spinner" style={{ width: 16, height: 16 }} />
              ) : "🔄"}
            </button>

            <button
              type="button"
              onClick={() => setConfigOpen(true)}
              title="Configurações"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "1px solid var(--color-border-hairline)",
                background: "var(--color-surface-card)",
                color: "var(--color-text-primary)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ⚙️
            </button>

            <button
              type="button"
              onClick={toggleColorMode}
              title="Alternar tema"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "1px solid var(--color-border-hairline)",
                background: "var(--color-surface-card)",
                color: "var(--color-text-primary)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              {colorMode === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </header>

        {/* Main content */}
        <main
          style={{
            flex: 1,
            paddingLeft: "var(--space-sm)",
            paddingRight: "var(--space-sm)",
            paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
            minWidth: 0,
            overflowX: "hidden",
          }}
          className="lg:pb-4"
        >
          {renderTab()}
        </main>

        {/* Dock (mobile only) */}
        <div className="dock lg:hidden">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={activeTab === item.id ? "dock-active" : ""}
            >
              <span aria-hidden style={{ fontSize: 20 }}>{item.icon}</span>
              <span className="dock-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Drawer side (desktop sidebar) */}
      <div className="drawer-side" style={{ zIndex: 40 }}>
        <label htmlFor="main-drawer" aria-label="Fechar menu" className="drawer-overlay" />
        <nav
          style={{
            width: 220,
            minHeight: "100%",
            backgroundColor: "var(--color-surface-card)",
            borderRight: "1px solid var(--color-border-hairline)",
            display: "flex",
            flexDirection: "column",
            padding: "var(--space-md)",
            gap: "var(--space-xs)",
          }}
        >
          <p
            style={{
              fontWeight: 700,
              fontSize: "1.1rem",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-md)",
            }}
          >
            💰 Finanças
          </p>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                padding: "var(--space-xs) var(--space-sm)",
                borderRadius: "var(--radius-lg)",
                border: "none",
                background: activeTab === item.id ? "color-mix(in srgb, var(--color-primary) 18%, var(--color-surface-card))" : "transparent",
                color: activeTab === item.id ? "var(--color-primary)" : "var(--color-text-body)",
                fontWeight: activeTab === item.id ? 700 : 400,
                cursor: "pointer",
                fontSize: "0.9rem",
                textAlign: "left",
                width: "100%",
              }}
            >
              <span aria-hidden style={{ fontSize: 18 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Toast notification */}
      {toastVisible && (
        <div className="toast toast-bottom toast-center" style={{ zIndex: 50 }}>
          <div
            role="alert"
            className={`alert ${syncState === "error" ? "alert-error" : "alert-success"}`}
            style={{ maxWidth: 360 }}
          >
            <span style={{ fontSize: "0.875rem" }}>{syncMessage}</span>
          </div>
        </div>
      )}

      <ConfigDialog open={configOpen} onClose={() => setConfigOpen(false)} />
    </div>
  );
}
