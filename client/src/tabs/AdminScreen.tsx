import { useState } from "react";
import { AdminTenants } from "./admin/AdminTenants.tsx";
import { AdminFilas } from "./admin/AdminFilas.tsx";
import { AdminWorkers } from "./admin/AdminWorkers.tsx";

type AdminTab = "tenants" | "filas" | "workers";

const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: "tenants", label: "Tenants" },
  { id: "filas", label: "Filas" },
  { id: "workers", label: "Workers" },
];

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<AdminTab>("tenants");

  return (
    <div style={{ padding: "var(--space-md)", maxWidth: 900, margin: "0 auto" }}>
      <h2
        style={{
          fontWeight: 700,
          fontSize: "1.2rem",
          color: "var(--color-text-primary)",
          marginBottom: "var(--space-md)",
        }}
      >
        🛡️ Administração
      </h2>

      <div role="tablist" className="admin-tabs" aria-label="Seções administrativas">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={activeTab === tab.id}
            className="admin-tab"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        style={{
          background: "var(--color-surface-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-hairline)",
          padding: "var(--space-md)",
        }}
      >
        {activeTab === "tenants" && <AdminTenants />}
        {activeTab === "filas" && <AdminFilas />}
        {activeTab === "workers" && <AdminWorkers />}
      </div>
    </div>
  );
}
