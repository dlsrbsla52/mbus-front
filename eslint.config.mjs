import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import mbus from "./scripts/eslint/mbus.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    name: "mbus/application",
    files: ["{app,components,constants,hooks,lib,store}/**/*.{js,jsx,ts,tsx}", "proxy.ts"],
    ignores: ["**/*.d.ts", "lib/api/generated/**"],
    plugins: { mbus },
    rules: {
      "mbus/no-stored-access-token": "error",
      "mbus/no-internal-api-path": "error",
    },
  },
  {
    name: "mbus/ui",
    files: ["{app,components,hooks}/**/*.{js,jsx,ts,tsx}"],
    ignores: ["app/**/route.{js,ts}", "**/*.d.ts"],
    rules: { "mbus/ui-api-boundary": ["error", "public"] },
  },
  {
    name: "mbus/manager-ui",
    files: [
      "app/{(manager),(manager-auth)}/**/*.{js,jsx,ts,tsx}",
      "{components,hooks}/manager/**/*.{js,jsx,ts,tsx}",
    ],
    ignores: ["app/**/route.{js,ts}", "**/*.d.ts"],
    rules: { "mbus/ui-api-boundary": ["error", "manager"] },
  },
  {
    name: "mbus/auth-store",
    files: ["store/useAuthStore.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{
          name: "zustand/middleware",
          importNames: ["persist"],
          message: "인증 상태는 메모리에 보관하세요. 재시작 후 복원은 components/auth/AuthGate.tsx가 담당합니다.",
        }],
      }],
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
