import { useState, useEffect, useMemo } from "react";
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Box,
  IconButton,
  Typography,
  ThemeProvider,
  CssBaseline,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { MonthPicker } from "./components/MonthPicker.tsx";
import { LoginScreen } from "./components/LoginScreen.tsx";
import { ConfigDialog } from "./components/ConfigDialog.tsx";
import { Resumo } from "./tabs/Resumo.tsx";
import { Gastos } from "./tabs/Gastos.tsx";
import { ProximoMes } from "./tabs/ProximoMes.tsx";
import { Previsao } from "./tabs/Previsao.tsx";
import { Investimentos } from "./tabs/Investimentos.tsx";
import { Insights } from "./tabs/Insights.tsx";
import Treinar from "./tabs/Treinar.tsx";
import { fetchDigest, fetchMeses, triggerSync } from "./api/client.ts";
import type { Digest } from "./api/types.ts";
import { createAppTheme, type AppColorMode } from "./theme.ts";

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

// Altura total da tabbar fixa (Paper bottom + BottomNavigation minHeight) + margem
const TABBAR_HEIGHT = 68;

export function App() {
  const [authToken, setAuthToken] = useState<string | null>(
    localStorage.getItem("authToken")
  );

  const [selectedMonth, setSelectedMonth] = useState(
    localStorage.getItem("selectedMonth") ?? ""
  );
  const [digest, setDigest] = useState<Digest | null>(null);
  const [meses, setMeses] = useState<string[]>([]);

  const handleMonthChange = (month: string) => {
    localStorage.setItem("selectedMonth", month);
    setSelectedMonth(month);
  };
  const [activeTab, setActiveTab] = useState(0);
  const [colorMode, setColorMode] = useState<AppColorMode>(
    (localStorage.getItem("colorMode") as AppColorMode) ?? "light"
  );
  const [syncState, setSyncState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [snackOpen, setSnackOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const toggleColorMode = () => {
    const nextMode = colorMode === "light" ? "dark" : "light";
    setColorMode(nextMode);
    localStorage.setItem("colorMode", nextMode);
  };

  const theme = useMemo(() => createAppTheme(colorMode), [colorMode]);

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
      setSnackOpen(true);
      // Refresh months list
      const newMeses = await fetchMeses();
      setMeses(newMeses);
      if (newMeses.length > 0 && !newMeses.includes(selectedMonth)) {
        handleMonthChange(newMeses[0]!);
      }
    } catch (err) {
      setSyncMessage(`Erro no sync: ${err instanceof Error ? err.message : String(err)}`);
      setSyncState("error");
      setSnackOpen(true);
    } finally {
      setTimeout(() => setSyncState("idle"), syncState === "error" ? 3000 : 2000);
    }
  }

  void meses; // used via setMeses for refresh

  // Show login screen if no valid token
  if (!authToken || !isTokenValid(authToken)) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginScreen
          onLogin={(token) => {
            localStorage.setItem("authToken", token);
            setAuthToken(token);
          }}
        />
      </ThemeProvider>
    );
  }

  const tabs = [
    selectedMonth ? <Resumo month={selectedMonth} digest={digest} /> : null,
    selectedMonth ? <Gastos month={selectedMonth} /> : null,
    <ProximoMes />,
    <Previsao />,
    selectedMonth ? <Investimentos month={selectedMonth} /> : null,
    selectedMonth ? <Insights month={selectedMonth} digest={digest} /> : null,
    <Treinar />,
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          width: "100%",
          maxWidth: 560,
          marginLeft: "auto",
          marginRight: "auto",
          minHeight: "100vh",
          boxSizing: "border-box",
          backgroundColor: "var(--color-canvas)",
          paddingLeft: "var(--space-sm)",
          paddingRight: "var(--space-sm)",
          paddingBottom: `calc(${TABBAR_HEIGHT}px + 8px + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        <Box
          component="header"
          sx={{
            py: "var(--space-md)",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "var(--space-sm)",
          }}
        >
          <div>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ color: "var(--color-text-primary)", lineHeight: 1.2 }}
            >
              💰 Finanças Familiar
            </Typography>
            <div className="mt-3">
              <MonthPicker value={selectedMonth} onChange={handleMonthChange} />
            </div>
          </div>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton
              onClick={() => void handleSync()}
              size="small"
              disabled={syncState === "loading"}
              title="Sincronizar dados"
            >
              {syncState === "loading" ? (
                <CircularProgress size={20} />
              ) : (
                <SyncRoundedIcon
                  color={syncState === "success" ? "success" : syncState === "error" ? "error" : "inherit"}
                />
              )}
            </IconButton>
            <IconButton onClick={() => setConfigOpen(true)} size="small" title="Configurações">
              <SettingsRoundedIcon />
            </IconButton>
            <IconButton onClick={toggleColorMode} size="small">
              {colorMode === "dark" ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
            </IconButton>
          </Box>
        </Box>

        <main style={{ overflowX: "hidden", minWidth: 0 }}>{tabs[activeTab]}</main>

        <Paper
          sx={{
            position: "fixed",
            bottom: "var(--space-sm)",
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - (var(--space-md) * 2))",
            maxWidth: "calc(560px - (var(--space-md) * 2))",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--color-border-hairline)",
            backgroundColor: "var(--color-surface-card)",
            overflow: "hidden",
            paddingBottom: "env(safe-area-inset-bottom, 8px)",
          }}
          elevation={0}
        >
          <BottomNavigation
            aria-label="Navegação principal"
            value={activeTab}
            onChange={(_e, v: number) => setActiveTab(v)}
            showLabels
            sx={{
              bgcolor: "transparent",
              minHeight: 60,
            }}
          >
            <BottomNavigationAction label="Resumo" icon={<HomeRoundedIcon />} />
            <BottomNavigationAction label="Gastos" icon={<ReceiptLongRoundedIcon />} />
            <BottomNavigationAction label="Próx. Mês" icon={<CalendarMonthRoundedIcon />} />
            <BottomNavigationAction label="Previsão" icon={<TrendingUpRoundedIcon />} />
            <BottomNavigationAction label="Investimentos" icon={<ShowChartRoundedIcon />} />
            <BottomNavigationAction label="Insights" icon={<AutoAwesomeRoundedIcon />} />
            <BottomNavigationAction label="🧠 Treinar" icon={<AutoAwesomeRoundedIcon />} />
          </BottomNavigation>
        </Paper>
      </Box>

      <Snackbar
        open={snackOpen}
        autoHideDuration={syncState === "error" ? 6000 : 4000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: `calc(${TABBAR_HEIGHT}px + var(--space-sm))` }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity={syncState === "error" ? "error" : "success"}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {syncMessage}
        </Alert>
      </Snackbar>

      <ConfigDialog open={configOpen} onClose={() => setConfigOpen(false)} />
    </ThemeProvider>
  );
}
