import { useState } from "react";
import { Box } from "@mui/material";
import { Previsao } from "./Previsao.tsx";
import TreinarDiario from "../components/TreinarDiario.tsx";
import DailyInsightsNavigator from "../components/DailyInsightsNavigator.tsx";

const SUB_TABS = ["Insights", "Previsões", "Treinar"];

export default function IaScreen() {
  const [activeSubTab, setActiveSubTab] = useState(0);

  return (
    <Box>
      <Box sx={{ borderBottom: "1px solid var(--color-border-hairline)", mb: "var(--space-md)", display: "flex" }}>
        {SUB_TABS.map((label, i) => (
          <button
            key={label}
            onClick={() => setActiveSubTab(i)}
            style={{
              flex: 1,
              padding: "8px 4px",
              background: "transparent",
              border: "none",
              borderBottom: activeSubTab === i
                ? "2px solid var(--color-primary)"
                : "2px solid transparent",
              color: activeSubTab === i ? "var(--color-primary)" : "var(--color-text-secondary, var(--color-muted))",
              fontWeight: activeSubTab === i ? 700 : 500,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "color 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </Box>

      {activeSubTab === 0 && <DailyInsightsNavigator />}
      {activeSubTab === 1 && <Previsao />}
      {activeSubTab === 2 && <TreinarDiario />}
    </Box>
  );
}
