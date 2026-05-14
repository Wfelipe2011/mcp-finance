import { useState, useEffect } from "react";
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { MonthPicker } from "./components/MonthPicker.tsx";
import { Resumo } from "./tabs/Resumo.tsx";
import { Gastos } from "./tabs/Gastos.tsx";
import { ProximoMes } from "./tabs/ProximoMes.tsx";
import { Investimentos } from "./tabs/Investimentos.tsx";
import { Insights } from "./tabs/Insights.tsx";
import { fetchDigest } from "./api/client.ts";
import type { Digest } from "./api/types.ts";

export function App() {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [digest, setDigest] = useState<Digest | null>(null);
  const [activeTab, setActiveTab] = useState(0);

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
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 px-4" style={{ paddingBottom: "56px" }}>
      <header className="py-4">
        <h1 className="text-xl font-bold text-gray-900">💰 Finanças Familiar</h1>
        <div className="mt-2">
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </header>

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
    </div>
  );
}
