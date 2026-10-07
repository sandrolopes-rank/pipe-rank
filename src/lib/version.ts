// Versão da aplicação exibida na UI (rodapé da sidebar).
//
// Regra de manutenção (SemVer simplificado, baseline v0.1.0 = commit inicial):
//   - commit "feat"  → incrementa MINOR e zera PATCH  (ex.: 0.10.2 → 0.11.0)
//   - commit "fix"   → incrementa PATCH               (ex.: 0.10.1 → 0.10.2)
//   - commit "chore"/"docs"/etc. → não altera a versão
// Manter sincronizado com o campo "version" do package.json.
export const APP_VERSION = "0.11.0";

// Forma curta exibida na UI (major.minor), ex.: "v0.11"
export const APP_VERSION_SHORT = `v${APP_VERSION.split(".").slice(0, 2).join(".")}`;
