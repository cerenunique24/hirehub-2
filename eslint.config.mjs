import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Bu proje veriyi sayfa/bileşen içinde `useEffect` + istemci Supabase
      // çağrısıyla yükler (bkz. COLLACREW_AUDIT_CONTEXT.md §1). React
      // Compiler kural seti bu yaygın deseni hata sayıyor; deseni topluca
      // yeniden yazmak bu işin kapsamı dışında olduğundan görünür kalması
      // için `warn` seviyesinde tutuluyor (gizlenmiyor). Yeni kod, effect
      // içinde tanımlanan async fonksiyon + `active` bayrağı desenini kullanır.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code çalışma ağaçları (git worktree kopyaları + derleme çıktıları)
    // proje kaynağı değildir.
    ".claude/**",
  ]),
]);

export default eslintConfig;
