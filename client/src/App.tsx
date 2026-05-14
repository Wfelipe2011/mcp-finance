import { useState, useEffect } from "react";
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from "@tremor/react";
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

  useEffect(() => {
    if (!selectedMonth) return;
    setDigest(null);
    fetchDigest(selectedMonth).then(setDigest).catch(() => setDigest(null));
  }, [selectedMonth]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 px-4 pb-8">
      <header className="py-4">
        <h1 className="text-xl font-bold text-gray-900">💰 Finanças Familiar</h1>
        <div className="mt-2">
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </header>

      <TabGroup>
        <TabList className="mt-2">
          <Tab>Resumo</Tab>
          <Tab>Gastos</Tab>
          <Tab>Próximo Mês</Tab>
          <Tab>Investimentos</Tab>
          <Tab>Insights</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            {selectedMonth && <Resumo month={selectedMonth} digest={digest} />}
          </TabPanel>
          <TabPanel>
            {selectedMonth && <Gastos month={selectedMonth} />}
          </TabPanel>
          <TabPanel>
            <ProximoMes />
          </TabPanel>
          <TabPanel>
            {selectedMonth && <Investimentos month={selectedMonth} />}
          </TabPanel>
          <TabPanel>
            {selectedMonth && <Insights month={selectedMonth} digest={digest} />}
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
