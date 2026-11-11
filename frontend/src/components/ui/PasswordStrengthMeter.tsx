// Medidor de força de senha (B-USERS-ACESSO-SEG, T1 · Emenda 6, item 1): só VISUAL — não bloqueia e não é regra; quem
// decide a senha é o servidor. Nasceu na aparência B da troca de senha (`screen-refs/troca-senha-3opcoes.reference.html`)
// e mora na biblioteca porque não havia equivalente (§4 item 3 do CLAUDE.md; registro em COMPONENT_LIBRARY.md).
// Conta tamanho (8 e 12), maiúscula com minúscula, número e símbolo: 0 sem senha; depois de 1 (fraca) a 4 (forte).

export const PASSWORD_STRENGTH_LABELS = ["Força: —", "Força: fraca", "Força: razoável", "Força: boa", "Força: forte"] as const;

export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

export function passwordStrength(password: string): PasswordStrengthLevel {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.max(1, Math.min(4, score)) as 1 | 2 | 3 | 4;
}

const STRENGTH_CSS = `
.ui-strength{display:flex;align-items:center;gap:10px;margin-top:8px}
.ui-strength__bars{flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.ui-strength__bars i{height:4px;border-radius:99px;background:#E2E8F0}
.ui-strength__text{font-size:12px;font-weight:600;color:#64748B;min-width:96px;text-align:right}
.ui-strength[data-nivel="1"] i:nth-child(-n+1){background:#DC2626}.ui-strength[data-nivel="1"] .ui-strength__text{color:#B91C1C}
.ui-strength[data-nivel="2"] i:nth-child(-n+2){background:#D97706}.ui-strength[data-nivel="2"] .ui-strength__text{color:#92400E}
.ui-strength[data-nivel="3"] i:nth-child(-n+3){background:#2563EB}.ui-strength[data-nivel="3"] .ui-strength__text{color:#1D4ED8}
.ui-strength[data-nivel="4"] i{background:#16A34A}.ui-strength[data-nivel="4"] .ui-strength__text{color:#166534}
`;

/** Barras e rótulo; escondido do leitor de tela (a lista de requisitos é o que diz o que falta). */
export function PasswordStrengthMeter({ password }: { readonly password: string }) {
  const level = passwordStrength(password);

  return (
    <div className="ui-strength" data-nivel={level} aria-hidden="true">
      <style>{STRENGTH_CSS}</style>
      <div className="ui-strength__bars">
        <i />
        <i />
        <i />
        <i />
      </div>
      <span className="ui-strength__text">{PASSWORD_STRENGTH_LABELS[level]}</span>
    </div>
  );
}
