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
} from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import { MonthPicker } from "./components/MonthPicker.tsx";
import { Resumo } from "./tabs/Resumo.tsx";
import { Gastos } from "./tabs/Gastos.tsx";
import { ProximoMes } from "./tabs/ProximoMes.tsx";
import { Investimentos } from "./tabs/Investimentos.tsx";
import { Insights } from "./tabs/Insights.tsx";
import { fetchDigest } from "./api/client.ts";
import type { Digest } from "./api/types.ts";

export function App() {
  const [selectedMonth, setSelectedMonth] = useState(
    localStorage.getItem("selectedMonth") ?? ""
  );
  const [digest, setDigest] = useState<Digest | null>(null);

  const handleMonthChange = (month: string) => {
    localStorage.setItem("selectedMonth", month);
    setSelectedMonth(month);
  };
  const [activeTab, setActiveTab] = useState(0);
  const [colorMode, setColorMode] = useState<"light" | "dark">(
    (localStorage.getItem("colorMode") as "light" | "dark") ?? "light"
  );

  const toggleColorMode = () => {
    const nextMode = colorMode === "light" ? "dark" : "light";
    setColorMode(nextMode);
    localStorage.setItem("colorMode", nextMode);
  };

  const theme = useMemo(() => createTheme({ palette: { mode: colorMode } }), [colorMode]);

  useEffect(() => {
    if (!selectedMonth) return;
    setDigest(null);
    fetchDigest(selectedMonth).then(setDigest).catch(() => setDigest(null));
  }, [selectedMonth]);

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
          <IconButton onClick={toggleColorMode} size="small">
            {colorMode === "dark" ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
          </IconButton>
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
    </ThemeProvider>
  );
}
