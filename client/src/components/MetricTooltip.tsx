import { useState, useEffect, useRef } from "react";
import { HelpOutlineRounded } from "../shims/mui/icons/HelpOutlineRounded";

type MetricTooltipProps = {
  title: string;
};

export function MetricTooltip({ title }: MetricTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        aria-label="Mais informações"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          verticalAlign: "middle",
          marginLeft: 4,
        }}
      >
        <HelpOutlineRounded fontSize="small" style={{ color: "var(--color-muted)" }} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            maxWidth: 280,
            backgroundColor: "var(--color-surface-elevated)",
            color: "var(--color-text-body)",
            border: "1px solid var(--color-border-hairline)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-sm) var(--space-md)",
            fontSize: "0.75rem",
            lineHeight: 1.5,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            whiteSpace: "normal",
          }}
        >
          <p style={{ margin: 0 }}>{title}</p>
        </div>
      )}
    </span>
  );
}
