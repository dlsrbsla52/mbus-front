import assert from "node:assert/strict";
import test from "node:test";
import { ESLint } from "eslint";

const eslint = new ESLint();
const manager = "app/(manager)/manager/stop/page.tsx";
const publicPage = "app/(protected)/reservation/new/page.tsx";
const boundary = "mbus/ui-api-boundary";

// Use the repository's flat config so an incorrectly scoped glob also fails the test.
const cases = [
  [manager, "export { AdminStopService } from '@/lib/api/admin/stop'"],
  [publicPage, "export { StopService } from '@/lib/api/stop'"],
  [manager, "export { STOP_TYPE_LABEL, type Stop } from '@/lib/api/stop-model'"],
  [manager, "export { AdminMemberService } from '@/lib/api/member'"],
  [manager, "export { StopService as list } from '@/lib/api/stop'", boundary],
  [manager, "import { StopService as stops } from '../../../../lib/api/stop'; stops.list()", boundary],
  ["components/manager/stop/Panel.tsx", "import * as stops from '@/lib/api/stop'; stops.StopService.list()", boundary],
  ["hooks/manager/useStops.ts", "import('@/lib/api/stop')", boundary],
  [manager, "export * from '@/lib/api/reservation'", boundary],
  [publicPage, "export { AdminStopService } from '@/lib/api/admin/stop'", boundary],
  [publicPage, "export type { StopMarker } from '@/lib/api/admin/stop-map'"],
  [manager, "export { api } from '@/lib/api/client'", boundary],
  [publicPage, "import('axios')", boundary],
  [manager, "export type { AxiosError } from 'axios'"],
  [manager, "export { apiFetcher } from '@/lib/api/swr'", boundary],
  [manager, "fetch('/api/v1/stop')", boundary],
  [manager, "const url = `${origin}/api/v1/stop/${id}`; window.fetch(url)", boundary],
  [publicPage, "fetch('/assets/map.json')"],
  ["lib/api/admin/stop.ts", "api.get('/api/v1/admin/stop')"],
  ["lib/api/stop.ts", "api.get('/api/v1/stop')"],
  ["lib/api/stop.ts", "api.get(`/api/v1/internal/${id}`)", "mbus/no-internal-api-path"],
  ["hooks/useTokens.ts", "window.sessionStorage.setItem('accessToken', token)", "mbus/no-stored-access-token"],
  ["hooks/useTokens.ts", "localStorage['access_token'] = token", "mbus/no-stored-access-token"],
  ["hooks/useTheme.ts", "localStorage.setItem('theme', theme)"],
  ["store/useAuthStore.ts", "export { persist } from 'zustand/middleware'", "no-restricted-imports"],
];

for (const [filePath, source, rule] of cases) {
  test(`${filePath} — ${source}`, async () => {
    const [result] = await eslint.lintText(source, { filePath });
    assert.deepEqual(result.messages.map((message) => message.ruleId), rule ? [rule] : []);
  });
}
