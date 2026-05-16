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
  createTheme,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
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
import { Investimentos } from "./tabs/Investimentos.tsx";
import { Insights } from "./tabs/Insights.tsx";
import { fetchDigest, fetchMeses, triggerSync } from "./api/client.ts";
import type { Digest } from "./api/types.ts";

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
  const [colorMode, setColorMode] = useState<"light" | "dark">(
    (localStorage.getItem("colorMode") as "light" | "dark") ?? "light"
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

  const theme = useMemo(() => createTheme({ palette: { mode: colorMode } }), [colorMode]);

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
    selectedMonth ? <Investimentos month={selectedMonth} /> : null,
    selectedMonth ? <Insights month={selectedMonth} digest={digest} /> : null,
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ maxWidth: 448, mx: "auto", minHeight: "100vh", bgcolor: "background.default", px: 2, pb: "56px" }}>
        <Box component="header" sx={{ py: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Typography variant="h6" fontWeight="bold">💰 Finanças Familiar</Typography>
            <div className="mt-2">
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

        <main>{tabs[activeTab]}</main>

        <Paper sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }} elevation={3}>
          <BottomNavigation
            value={activeTab}
            onChange={(_e, v: number) => setActiveTab(v)}
            showLabels
          >
            <BottomNavigationAction label="Resumo" icon={<HomeRoundedIcon />} />
            <BottomNavigationAction label="Gastos" icon={<ReceiptLongRoundedIcon />} />
            <BottomNavigationAction label="Próx. Mês" icon={<CalendarMonthRoundedIcon />} />
            <BottomNavigationAction label="Investimentos" icon={<ShowChartRoundedIcon />} />
            <BottomNavigationAction label="Insights" icon={<AutoAwesomeRoundedIcon />} />
          </BottomNavigation>
        </Paper>
      </Box>

      <Snackbar
        open={snackOpen}
        autoHideDuration={syncState === "error" ? 6000 : 4000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
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
