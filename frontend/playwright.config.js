import { defineConfig, devices } from "@playwright/test";

// ต้องเปิด MySQL + backend (http://127.0.0.1:8000) และรัน seed.py ไว้ก่อน
// frontend (vite) จะถูกเปิดให้อัตโนมัติถ้ายังไม่ได้รันอยู่
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // login ใช้ bcrypt (~0.5 วินาที/ครั้ง) ถ้ารันขนานมากไป backend จะตอบช้าจน timeout
  workers: 2,
  retries: 0,
  // vite dev โหลดหน้าแรกของแต่ละเทสต์ค่อนข้างช้า
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // กล้องปลอมสำหรับหน้าเช็คชื่อ/ลงทะเบียนใบหน้า
    permissions: ["camera"],
    launchOptions: {
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
