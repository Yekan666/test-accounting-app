import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // 防止 Vite 遮盖 Rust 错误
  clearScreen: false,

  server: {
    // Tauri 期望在 5173 端口
    port: 5173,
    strictPort: true,
  },
});
