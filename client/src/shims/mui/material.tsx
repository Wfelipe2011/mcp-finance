import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Card } from "@tremor/react";

type SxValue = Record<string, unknown> | CSSProperties | undefined;

type CommonProps = {
  children?: ReactNode;
  className?: string;
  sx?: SxValue;
  style?: CSSProperties;
};

// Mapeamento de shorthands MUI → propriedades CSS
const MUI_SHORTHANDS: Record<string, string | string[]> = {
  p: "padding",
  px: ["paddingLeft", "paddingRight"],
  py: ["paddingTop", "paddingBottom"],
  pt: "paddingTop",
  pb: "paddingBottom",
  pl: "paddingLeft",
  pr: "paddingRight",
  m: "margin",
  mx: ["marginLeft", "marginRight"],
  my: ["marginTop", "marginBottom"],
  mt: "marginTop",
  mb: "marginBottom",
  ml: "marginLeft",
  mr: "marginRight",
  bgcolor: "backgroundColor",
};

// Shorthands de espaçamento que aceitam número (× 8px como no MUI)
const SPACING_KEYS = new Set(["p", "px", "py", "pt", "pb", "pl", "pr", "m", "mx", "my", "mt", "mb", "ml", "mr"]);

function sxToStyle(sx?: SxValue): CSSProperties {
  if (!sx || typeof sx !== "object") {
    return {};
  }

  const result: CSSProperties = {};
  for (const [key, value] of Object.entries(sx)) {
    if (key.startsWith("&")) continue;

    const shorthand = MUI_SHORTHANDS[key];
    if (shorthand !== undefined) {
      // Para shorthands de espaçamento com número, multiplica por 8px (padrão MUI)
      const cssValue =
        typeof value === "number" && SPACING_KEYS.has(key)
          ? `${value * 8}px`
          : value;
      if (typeof cssValue === "string" || typeof cssValue === "number") {
        if (Array.isArray(shorthand)) {
          for (const prop of shorthand) {
            (result as Record<string, string | number>)[prop] = cssValue;
          }
        } else {
          (result as Record<string, string | number>)[shorthand] = cssValue;
        }
      }
      continue;
    }

    if (typeof value === "string" || typeof value === "number") {
      (result as Record<string, string | number>)[key] = value;
    }
  }
  return result;
}

function mergeStyle(style?: CSSProperties, sx?: SxValue): CSSProperties {
  return {
    ...sxToStyle(sx),
    ...style,
  };
}

export function createTheme<T extends Record<string, unknown>>(config: T): T {
  return config;
}

export function ThemeProvider({ children }: { children?: ReactNode; theme?: unknown }) {
  return <>{children}</>;
}

export function CssBaseline() {
  return null;
}

type BoxProps = CommonProps & {
  component?: keyof JSX.IntrinsicElements;
} & Record<string, unknown>;

export function Box({ component = "div", children, sx, style, ...rest }: BoxProps) {
  const Component = component as keyof JSX.IntrinsicElements;
  return (
    <Component style={mergeStyle(style, sx)} {...rest}>
      {children}
    </Component>
  );
}

type PaperProps = CommonProps & {
  elevation?: number;
} & Record<string, unknown>;

export function Paper({ children, sx, style, ...rest }: PaperProps) {
  return (
    <Card style={mergeStyle(style, sx)} {...rest}>
      {children}
    </Card>
  );
}

type IconButtonProps = CommonProps & {
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
  title?: string;
  "aria-label"?: string;
} & Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "style" | "children" | "onClick" | "title"
  >;

export function IconButton({
  children,
  onClick,
  disabled,
  size = "medium",
  sx,
  style,
  className,
  ...rest
}: IconButtonProps) {
  const sizeMap = { small: 30, medium: 36, large: 42 };
  const buttonStyle: CSSProperties = {
    width: sizeMap[size],
    height: sizeMap[size],
    borderRadius: "999px",
    border: "1px solid var(--color-border-hairline)",
    background: "var(--color-surface-card)",
    color: "var(--color-text-primary)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    ...mergeStyle(style, sx),
  };

  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled} style={buttonStyle} {...rest}>
      {children}
    </button>
  );
}

type CircularProgressProps = {
  size?: number;
  color?: "inherit" | "primary";
};

export function CircularProgress({ size = 20, color = "primary" }: CircularProgressProps) {
  const borderColor = color === "inherit" ? "currentcolor" : "var(--color-primary)";
  return (
    <span
      aria-label="loading"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid color-mix(in srgb, ${borderColor} 30%, transparent)`,
        borderTopColor: borderColor,
        display: "inline-block",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}

type VariantName =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "subtitle1"
  | "subtitle2"
  | "body1"
  | "body2"
  | "caption";

const VARIANT_TAG: Record<VariantName, keyof JSX.IntrinsicElements> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  subtitle1: "p",
  subtitle2: "p",
  body1: "p",
  body2: "p",
  caption: "p",
};

const VARIANT_STYLE: Record<VariantName, CSSProperties> = {
  h1: { fontSize: "2rem", lineHeight: 1.1, fontWeight: 700 },
  h2: { fontSize: "1.7rem", lineHeight: 1.15, fontWeight: 700 },
  h3: { fontSize: "1.45rem", lineHeight: 1.15, fontWeight: 700 },
  h4: { fontSize: "1.3rem", lineHeight: 1.2, fontWeight: 700 },
  h5: { fontSize: "1.15rem", lineHeight: 1.25, fontWeight: 700 },
  h6: { fontSize: "1rem", lineHeight: 1.3, fontWeight: 700 },
  subtitle1: { fontSize: "1rem", lineHeight: 1.5, fontWeight: 600 },
  subtitle2: { fontSize: "0.95rem", lineHeight: 1.45, fontWeight: 600 },
  body1: { fontSize: "0.95rem", lineHeight: 1.6 },
  body2: { fontSize: "0.88rem", lineHeight: 1.55 },
  caption: { fontSize: "0.75rem", lineHeight: 1.45 },
};

type TypographyProps = CommonProps & {
  variant?: VariantName;
  color?: "text.primary" | "text.secondary" | "text.disabled" | "success.main";
  fontWeight?: number;
  fontStyle?: "italic" | "normal";
  textAlign?: "left" | "center" | "right";
  mt?: number;
  mb?: number;
  noWrap?: boolean;
  gutterBottom?: boolean;
  display?: string;
} & Record<string, unknown>;

export function Typography({
  children,
  variant = "body1",
  color,
  sx,
  style,
  fontWeight,
  fontStyle,
  textAlign,
  mt,
  mb,
  noWrap,
  gutterBottom,
  display,
  ...rest
}: TypographyProps) {
  const Tag = VARIANT_TAG[variant];
  const colorMap: Record<string, string> = {
    "text.primary": "var(--color-text-primary)",
    "text.secondary": "var(--color-muted)",
    "text.disabled": "var(--color-muted)",
    "success.main": "var(--color-trading-up)",
  };

  const finalStyle: CSSProperties = {
    margin: 0,
    ...VARIANT_STYLE[variant],
    ...(color ? { color: colorMap[color] ?? color } : {}),
    ...(fontWeight !== undefined ? { fontWeight } : {}),
    ...(fontStyle ? { fontStyle } : {}),
    ...(textAlign ? { textAlign } : {}),
    ...(mt !== undefined ? { marginTop: `${mt}rem` } : {}),
    ...(mb !== undefined ? { marginBottom: `${mb}rem` } : {}),
    ...(display ? { display } : {}),
    ...(noWrap
      ? {
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }
      : {}),
    ...(gutterBottom ? { marginBottom: "0.35rem" } : {}),
    ...mergeStyle(style, sx),
  };

  return (
    <Tag style={finalStyle} {...rest}>
      {children}
    </Tag>
  );
}

type BottomNavigationContextValue = {
  value: number;
  onChange?: (event: MouseEvent<HTMLElement>, value: number) => void;
};

const BottomNavigationContext = createContext<BottomNavigationContextValue>({ value: 0 });

type BottomNavigationProps = CommonProps & {
  value: number;
  onChange?: (event: MouseEvent<HTMLElement>, value: number) => void;
  showLabels?: boolean;
} & Record<string, unknown>;

export function BottomNavigation({ children, value, onChange, showLabels: _showLabels, sx, style, ...rest }: BottomNavigationProps) {
  const valueCtx = useMemo(() => ({ value, onChange }), [value, onChange]);

  const indexed = Children.map(children, (child, index) => {
    if (!isValidElement(child)) return child;
    return cloneElement(child, { __index: index });
  });

  return (
    <BottomNavigationContext.Provider value={valueCtx}>
      <nav
        aria-label="Navegação"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gap: "0.25rem",
          ...mergeStyle(style, sx),
        }}
        {...rest}
      >
        {indexed}
      </nav>
    </BottomNavigationContext.Provider>
  );
}

type BottomNavigationActionProps = {
  label: string;
  icon?: ReactNode;
  __index?: number;
};

export function BottomNavigationAction({ label, icon, __index = 0 }: BottomNavigationActionProps) {
  const { value, onChange } = useContext(BottomNavigationContext);
  const selected = value === __index;

  return (
    <button
      type="button"
      aria-current={selected ? "page" : undefined}
      onClick={(event) => onChange?.(event, __index)}
      style={{
        border: "none",
        background: "transparent",
        color: selected ? "var(--color-primary)" : "var(--color-text-body)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.45rem 0.25rem",
        gap: "0.16rem",
        borderRadius: "var(--radius-md)",
        fontSize: "0.72rem",
        fontWeight: selected ? 600 : 500,
        cursor: "pointer",
      }}
    >
      <span aria-hidden style={{ display: "inline-flex", lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

type AlertProps = CommonProps & {
  severity?: "success" | "error";
  onClose?: () => void;
  variant?: "filled" | "outlined" | "standard";
};

export function Alert({ children, severity = "success", onClose, sx, style }: AlertProps) {
  const tone =
    severity === "error"
      ? {
          color: "var(--color-trading-down)",
          border: "color-mix(in srgb, var(--color-trading-down) 55%, var(--color-border-hairline))",
          bg: "color-mix(in srgb, var(--color-trading-down) 12%, var(--color-surface-card))",
        }
      : {
          color: "var(--color-trading-up)",
          border: "color-mix(in srgb, var(--color-trading-up) 55%, var(--color-border-hairline))",
          bg: "color-mix(in srgb, var(--color-trading-up) 12%, var(--color-surface-card))",
        };

  return (
    <div
      role="alert"
      style={{
        color: tone.color,
        border: `1px solid ${tone.border}`,
        background: tone.bg,
        borderRadius: "var(--radius-md)",
        padding: "0.65rem 0.75rem",
        fontSize: "0.85rem",
        ...mergeStyle(style, sx),
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
        <div>{children}</div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer" }}
            aria-label="Fechar"
          >
            x
          </button>
        ) : null}
      </div>
    </div>
  );
}

type SnackbarProps = {
  open: boolean;
  children?: ReactNode;
  autoHideDuration?: number;
  onClose?: () => void;
  anchorOrigin?: {
    vertical?: "top" | "bottom";
    horizontal?: "left" | "center" | "right";
  };
  sx?: SxValue;
};

export function Snackbar({
  open,
  children,
  autoHideDuration = 4000,
  onClose,
  anchorOrigin,
  sx,
}: SnackbarProps) {
  useEffect(() => {
    if (!open || !onClose) return;
    const timer = window.setTimeout(() => onClose(), autoHideDuration);
    return () => window.clearTimeout(timer);
  }, [open, autoHideDuration, onClose]);

  if (!open) return null;

  const vertical = anchorOrigin?.vertical ?? "bottom";
  const horizontal = anchorOrigin?.horizontal ?? "center";

  const horizontalPosition: CSSProperties =
    horizontal === "left"
      ? { left: "1rem", transform: "none" }
      : horizontal === "right"
        ? { right: "1rem", left: "auto", transform: "none" }
        : { left: "50%", transform: "translateX(-50%)" };

  return (
    <div
      style={{
        position: "fixed",
        [vertical === "top" ? "top" : "bottom"]: "1.25rem",
        width: "min(520px, calc(100% - 2rem))",
        zIndex: 100,
        ...horizontalPosition,
        ...sxToStyle(sx),
      }}
    >
      {children}
    </div>
  );
}

type ButtonProps = CommonProps & {
  variant?: "contained" | "text" | "outlined";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  color?: "primary";
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style" | "children" | "onClick">;

export function Button({
  children,
  variant = "contained",
  size = "medium",
  disabled,
  fullWidth,
  onClick,
  type = "button",
  sx,
  style,
  className,
  ...rest
}: ButtonProps) {
  const paddings = {
    small: "0.35rem 0.6rem",
    medium: "0.5rem 0.8rem",
    large: "0.72rem 1rem",
  };

  const base: CSSProperties = {
    borderRadius: "var(--radius-md)",
    border: "1px solid transparent",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    width: fullWidth ? "100%" : undefined,
    padding: paddings[size],
    fontSize: size === "small" ? "0.8rem" : "0.9rem",
  };

  const stylesByVariant: Record<string, CSSProperties> = {
    contained: {
      background: "var(--color-primary)",
      color: "var(--color-on-primary)",
      borderColor: "var(--color-primary)",
    },
    outlined: {
      background: "transparent",
      color: "var(--color-text-primary)",
      borderColor: "var(--color-border-hairline)",
    },
    text: {
      background: "transparent",
      color: "var(--color-primary)",
      borderColor: "transparent",
      paddingLeft: 0,
      paddingRight: 0,
    },
  };

  return (
    <button
      type={type}
      className={className}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...base,
        ...stylesByVariant[variant],
        ...mergeStyle(style, sx),
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

type TextFieldProps = CommonProps & {
  label?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  required?: boolean;
  fullWidth?: boolean;
  type?: string;
  size?: "small" | "medium";
};

export function TextField({
  label,
  value,
  onChange,
  autoComplete,
  required,
  fullWidth,
  type = "text",
  sx,
  style,
}: TextFieldProps) {
  return (
    <label style={{ display: "grid", gap: "0.3rem", width: fullWidth ? "100%" : undefined, ...mergeStyle(style, sx) }}>
      {label ? (
        <span style={{ color: "var(--color-muted)", fontSize: "0.75rem", fontWeight: 600 }}>{label}</span>
      ) : null}
      <input
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        type={type}
        style={{
          width: "100%",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border-hairline)",
          background: "var(--color-surface-strong)",
          color: "var(--color-text-primary)",
          padding: "0.55rem 0.7rem",
          fontSize: "0.88rem",
        }}
      />
    </label>
  );
}

type FormControlProps = CommonProps & {
  fullWidth?: boolean;
  size?: "small" | "medium";
  variant?: "outlined" | "filled" | "standard";
};

export function FormControl({ children, fullWidth, sx, style }: FormControlProps) {
  return <div style={{ width: fullWidth ? "100%" : undefined, ...mergeStyle(style, sx) }}>{children}</div>;
}

export type SelectChangeEvent = React.ChangeEvent<HTMLSelectElement>;

type SelectProps = CommonProps & {
  value: string;
  onChange?: (event: SelectChangeEvent) => void;
  displayEmpty?: boolean;
  MenuProps?: unknown;
};

export function Select({ value, onChange, children, sx, style }: SelectProps) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: "100%",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-hairline)",
        background: "var(--color-surface-strong)",
        color: "var(--color-text-primary)",
        padding: "0.55rem 0.7rem",
        ...mergeStyle(style, sx),
      }}
    >
      {children}
    </select>
  );
}

type MenuItemProps = {
  value: string;
  children?: ReactNode;
  sx?: SxValue;
  style?: CSSProperties;
};

export function MenuItem({ value, children, sx, style }: MenuItemProps) {
  return (
    <option value={value} style={mergeStyle(style, sx)}>
      {children}
    </option>
  );
}

type ChipProps = CommonProps & {
  label: string;
  size?: "small" | "medium";
  color?: "primary";
  variant?: "outlined" | "filled";
};

export function Chip({ label, size = "medium", variant = "filled", sx, style }: ChipProps) {
  return (
    <span
      style={{
        borderRadius: "var(--radius-pill)",
        border: variant === "outlined" ? "1px solid var(--color-border-hairline)" : "1px solid transparent",
        background:
          variant === "outlined"
            ? "color-mix(in srgb, var(--color-surface-strong) 65%, transparent)"
            : "color-mix(in srgb, var(--color-primary) 14%, transparent)",
        color: variant === "outlined" ? "var(--color-text-body)" : "var(--color-primary)",
        fontSize: size === "small" ? "0.68rem" : "0.78rem",
        fontWeight: 700,
        padding: "2px 8px",
        lineHeight: 1.4,
        ...mergeStyle(style, sx),
      }}
    >
      {label}
    </span>
  );
}

type LinearProgressProps = {
  variant?: "determinate";
  value?: number;
  color?: "primary" | "error";
  sx?: SxValue;
};

export function LinearProgress({ value = 0, color = "primary", sx }: LinearProgressProps) {
  const barColor = color === "error" ? "var(--color-trading-down)" : "var(--color-primary)";
  const outerStyle = mergeStyle(
    {
      background: "color-mix(in srgb, var(--color-surface-strong) 70%, transparent)",
      borderRadius: "var(--radius-pill)",
      height: "8px",
      overflow: "hidden",
    },
    sx,
  );

  return (
    <div style={outerStyle}>
      <div
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: "100%",
          background: barColor,
          transition: "width 200ms ease",
        }}
      />
    </div>
  );
}

type DialogProps = {
  open: boolean;
  onClose?: () => void;
  children?: ReactNode;
  fullWidth?: boolean;
  maxWidth?: "sm" | "md" | "lg";
  PaperProps?: {
    sx?: SxValue;
  };
};

export function Dialog({ open, onClose, children, maxWidth = "sm", PaperProps }: DialogProps) {
  if (!open) return null;

  const maxWidths: Record<string, string> = {
    sm: "min(560px, calc(100% - 2rem))",
    md: "min(720px, calc(100% - 2rem))",
    lg: "min(920px, calc(100% - 2rem))",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4, 8, 16, 0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 120,
        padding: "1rem",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: maxWidths[maxWidth],
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-border-hairline)",
          background: "var(--color-surface-card)",
          ...sxToStyle(PaperProps?.sx),
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogTitle({ children, sx, style }: CommonProps) {
  return (
    <div
      style={{
        padding: "1rem 1rem 0.75rem",
        borderBottom: "1px solid var(--color-border-hairline)",
        ...mergeStyle(style, sx),
      }}
    >
      {children}
    </div>
  );
}

export function DialogContent({ children, sx, style }: CommonProps) {
  return (
    <div
      style={{
        padding: "1rem",
        ...mergeStyle(style, sx),
      }}
    >
      {children}
    </div>
  );
}

type TableProps = CommonProps & {
  size?: "small" | "medium";
};

export function Table({ children, sx, style }: TableProps) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          ...mergeStyle(style, sx),
        }}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children?: ReactNode }) {
  return <thead>{children}</thead>;
}

export function TableBody({ children }: { children?: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children }: { children?: ReactNode }) {
  return <tr>{children}</tr>;
}

type TableCellProps = CommonProps & {
  align?: "left" | "right" | "center";
};

export function TableCell({ children, align = "left", sx, style }: TableCellProps) {
  return (
    <td
      style={{
        textAlign: align,
        padding: "0.58rem 0.5rem",
        fontSize: "0.84rem",
        color: "var(--color-text-body)",
        borderBottom: "1px solid var(--color-border-hairline)",
        ...mergeStyle(style, sx),
      }}
    >
      {children}
    </td>
  );
}

export function useMediaQuery(query: string): boolean {
  const getInitial = () => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState<boolean>(getInitial);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
