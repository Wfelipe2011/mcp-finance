import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@mui/material",
        replacement: path.resolve(__dirname, "src/shims/mui/material.tsx"),
      },
      {
        find: /^@mui\/icons-material\/(.*)$/,
        replacement: path.resolve(__dirname, "src/shims/mui/icons/$1.tsx"),
      },
      {
        find: "@mui/x-charts/BarChart",
        replacement: path.resolve(__dirname, "src/shims/mui/charts/BarChart.tsx"),
      },
      {
        find: "@mui/x-charts/LineChart",
        replacement: path.resolve(__dirname, "src/shims/mui/charts/LineChart.tsx"),
      },
      {
        find: "@mui/x-charts/PieChart",
        replacement: path.resolve(__dirname, "src/shims/mui/charts/PieChart.tsx"),
      },
    ],
  },
  base: "/",
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
