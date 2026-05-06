import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "powershell -Command \"$env:APP_PORT='3001'; $env:PROFILE_REPO_MODE='memory'; $env:PROVIDER_VALIDATION_MODE='stub'; $env:TELEGRAM_BOT_TOKEN='123456:phase-1-test-bot-token'; corepack pnpm --filter ./apps/api dev\"",
      url: "http://127.0.0.1:3001/health",
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: "corepack pnpm --filter ./apps/telegram-miniapp dev",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
