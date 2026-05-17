import type { CSSProperties } from "react";

type IconProps = {
  fontSize?: "small" | "medium" | "large";
  style?: CSSProperties;
};

const sizeMap = {
  small: 16,
  medium: 20,
  large: 24,
};

export function GlyphIcon({ glyph, fontSize = "medium", style }: IconProps & { glyph: string }) {
  return (
    <span
      aria-hidden
      style={{
        width: sizeMap[fontSize],
        height: sizeMap[fontSize],
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: sizeMap[fontSize],
        lineHeight: 1,
        ...style,
      }}
    >
      {glyph}
    </span>
  );
}
