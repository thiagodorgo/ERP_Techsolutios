import { Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

// B-USERS-ACESSO-SEG (T1) — troca da senha provisória, aparência A · Padrão fiel: o cartão do login com outro título.
// Alvo exato: `docs/claude-code-handoff/screen-refs/troca-senha-3opcoes.reference.html` (aprovada pelo dono em 10/11,
// "Aprovo as 3"). Tela-modelo: `pages/LoginPage.tsx` (marca, cartão, `.lg-input`, faixa, botão primário e o secundário,
// estilos copiados de lá, como a referência registra). A sessão restrita abre SEMPRE nesta (Emenda 4, item 3).
// Este arquivo também guarda as peças comuns às 3 aparências (moldura, campo de senha com "Mostrar", faixa, botões e
// estilos), que B e C importam: o PERMITIDO do bloco não tem arquivo próprio para elas (diário, leitura L4).
// As views são PURAS: o estado e o fluxo moram no contêiner (`pages/ChangePasswordPage.tsx`). As senhas só passam por
// memória (props), nunca por armazenamento nem log.

export type ChangePasswordField = "current" | "next" | "confirm";

export type ChangePasswordFocusRequest = {
  readonly field: ChangePasswordField;
  readonly seq: number;
};

export type ChangePasswordViewModel = {
  /** E-mail da PRÓPRIA sessão, na linha "Entrando como" (Emenda 4, item 4). */
  readonly email: string;
  readonly values: Readonly<Record<ChangePasswordField, string>>;
  readonly onChange: (field: ChangePasswordField, value: string) => void;
  readonly onSubmit: () => void;
  readonly onSignOut: () => void;
  /** Envio em curso: campos, "Mostrar", "Alterar" e "Sair" travados; nada de duplo envio. */
  readonly submitting: boolean;
  /** Acesso não permitido (403 do mapa): formulário travado, só "Sair". */
  readonly locked: boolean;
  /** Texto fixo da faixa de erro (mapa de T.1 ou validação local); nunca a mensagem do servidor. */
  readonly banner: string | null;
  /** 401 `invalid_credentials` (ou "Continuar" sem a provisória): a provisória fica marcada. */
  readonly invalidCurrent: boolean;
  /** A pessoa já tentou salvar: na B, o requisito pendente passa a "não atendido". */
  readonly attempted: boolean;
  /** Só a C usa: 1 = a provisória; 2 = a nova senha. */
  readonly step: 1 | 2;
  readonly onEditCurrent: () => void;
  readonly focusRequest: ChangePasswordFocusRequest | null;
};

export type ChangePasswordViewProps = {
  readonly model: ChangePasswordViewModel;
};

export const FIELD_LABELS: Readonly<Record<ChangePasswordField, string>> = {
  current: "Senha provisória",
  next: "Nova senha",
  confirm: "Confirme a nova senha",
};

const FIELD_SHOW_LABELS: Readonly<Record<ChangePasswordField, string>> = {
  current: "Mostrar senha provisória",
  next: "Mostrar nova senha",
  confirm: "Mostrar confirmação da nova senha",
};

const FIELD_AUTOCOMPLETE: Readonly<Record<ChangePasswordField, string>> = {
  current: "current-password",
  next: "new-password",
  confirm: "new-password",
};

export const CHANGE_PASSWORD_TITLE = "Crie sua nova senha";
export const CHANGE_PASSWORD_SUPPORT = "Por segurança, troque a senha provisória antes de continuar.";

/** Estilos da família do login (`LoginPage.tsx:52-57` e estilos em linha), com os estados da referência; escopo `.troca-senha`. */
export const CHANGE_PASSWORD_BASE_CSS = `
.troca-senha{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 24px;background:#F1F5F9;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;color:#0F172A}
.troca-senha [hidden]{display:none!important}
.troca-senha .ts-col{width:100%;max-width:420px}
.troca-senha .sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.troca-senha .nw{white-space:nowrap}
.troca-senha .lg-marca{display:flex;justify-content:center;margin-bottom:32px}
.troca-senha .lg-marca__in{display:flex;align-items:center;gap:12px}
.troca-senha .lg-marca__ic{width:44px;height:44px;border-radius:12px;background:#0D1B2A;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.troca-senha .lg-marca__txt{display:flex;flex-direction:column}
.troca-senha .lg-marca__nome{font-size:22px;font-weight:800;color:#0F172A;letter-spacing:-.3px;white-space:nowrap}
.troca-senha .lg-marca__sub{font-size:13px;font-weight:500;color:#64748B;margin-top:2px}
.troca-senha .lg-card{background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:36px;box-shadow:0 4px 24px rgba(0,0,0,.06)}
.troca-senha .lg-titulo{margin:0 0 4px;font-size:24px;font-weight:800;color:#0F172A}
.troca-senha .lg-apoio{margin:0 0 20px;font-size:14px;color:#64748B;line-height:1.45}
.troca-senha .lg-apoio--conta{margin-bottom:6px}
.troca-senha .lg-conta{margin:0 0 20px;font-size:12.5px;font-weight:500;color:#64748B;line-height:1.45;overflow-wrap:anywhere}
.troca-senha .lg-conta b{font-weight:600}
.troca-senha .lg-faixa{display:flex;align-items:center;gap:9px;padding:11px 14px;border-radius:10px;background:#FEF2F2;border:1px solid #FECACA;margin-bottom:18px}
.troca-senha .lg-faixa__ponto{width:7px;height:7px;border-radius:50%;background:#DC2626;flex-shrink:0}
.troca-senha .lg-faixa__txt{font-size:12.5px;font-weight:600;color:#B91C1C;line-height:1.45}
.troca-senha form{margin:0}
.troca-senha .lg-campo{margin-bottom:16px}
.troca-senha .lg-campo--ultimo{margin-bottom:10px}
.troca-senha .lg-rotulo{display:block;font-size:12.5px;font-weight:700;color:#374151;margin-bottom:6px}
.troca-senha .lg-input{display:block;width:100%;padding:12px 14px;border:1.5px solid #E2E8F0;border-radius:10px;background:#fff;font-size:14px;color:#0F172A;font-family:inherit;outline:none}
.troca-senha .lg-input:focus{border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.1)}
.troca-senha .lg-input::placeholder{color:#94A3B8}
.troca-senha .lg-input:disabled{opacity:.55;cursor:not-allowed}
.troca-senha .lg-input[readonly]{background:#F8FAFC}
.troca-senha .lg-input[aria-invalid="true"]{border-color:#DC2626}
.troca-senha .lg-input[aria-invalid="true"]:focus{box-shadow:0 0 0 3px rgba(220,38,38,.1)}
.troca-senha .lg-senha{position:relative}
.troca-senha .lg-senha .lg-input{padding-right:46px}
.troca-senha .lg-olho{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:34px;height:34px;border:0;border-radius:8px;background:transparent;color:#64748B;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}
.troca-senha .lg-olho:hover:not(:disabled){background:#F1F5F9;color:#0F172A}
.troca-senha .lg-olho:focus-visible{outline:2px solid #2563EB;outline-offset:0}
.troca-senha .lg-olho:disabled{opacity:.55;cursor:not-allowed}
.troca-senha .lg-olho[aria-pressed="true"]{color:#2563EB}
.troca-senha .lg-dica{margin:0 0 24px;font-size:12.5px;font-weight:500;color:#64748B;line-height:1.45}
.troca-senha .lg-btn{width:100%;padding:13px;background:#2563EB;border:none;border-radius:10px;font-size:14px;font-weight:700;color:#fff;cursor:pointer;font-family:inherit;margin-bottom:16px;display:flex;align-items:center;justify-content:center;gap:8px}
.troca-senha .lg-btn:focus-visible,.troca-senha .lg-btn2:focus-visible{outline:2px solid #2563EB;outline-offset:2px}
.troca-senha .lg-btn:disabled{cursor:not-allowed;opacity:.55}
.troca-senha .lg-btn.is-carregando:disabled{opacity:1;cursor:default}
.troca-senha .lg-spin{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;animation:ts-spin .7s linear infinite;flex-shrink:0}
@keyframes ts-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.troca-senha .lg-spin{animation:none}}
.troca-senha .lg-btn2{width:100%;padding:12px;background:#fff;border:1.5px solid #E2E8F0;border-radius:10px;font-size:14px;font-weight:600;color:#374151;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:10px}
.troca-senha .lg-btn2:disabled{cursor:not-allowed;opacity:.55}
`;

export function ChangePasswordBaseStyles() {
  return <style>{CHANGE_PASSWORD_BASE_CSS}</style>;
}

function BrandMark() {
  return (
    <div className="lg-marca">
      <div className="lg-marca__in">
        <div className="lg-marca__ic">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7BE084" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M12 21V11" />
            <path d="M12 11c-4 0-7-2.6-7.8-6.4C8 4 11 6 12 9.6" />
            <path d="M12 9.6C13 6 16 4 19.8 4.6 19 8.4 16 11 12 11" />
          </svg>
        </div>
        <div className="lg-marca__txt">
          <div className="lg-marca__nome">TechSolutions</div>
          <div className="lg-marca__sub">Plataforma de operações de campo</div>
        </div>
      </div>
    </div>
  );
}

/** Faixa de erro do login (`LoginPage.tsx:89-94`), texto em `#B91C1C` para o AA (nota da referência). */
export function ChangePasswordErrorBanner({ text }: { readonly text: string }) {
  return (
    <div className="lg-faixa" role="alert">
      <span className="lg-faixa__ponto" aria-hidden="true" />
      <span className="lg-faixa__txt">{text}</span>
    </div>
  );
}

/**
 * A moldura comum: marca, cartão, título, apoio, a linha "Entrando como <e-mail>" (texto simples, não é campo nem
 * link), a faixa, o formulário e "Sair". O campo oculto `username` leva o mesmo e-mail ao gerenciador de senhas.
 */
export function ChangePasswordCard({
  model,
  idPrefix,
  children,
}: {
  readonly model: ChangePasswordViewModel;
  readonly idPrefix: string;
  readonly children: ReactNode;
}) {
  const titleId = `${idPrefix}-tit`;
  const accountId = `${idPrefix}-conta`;

  return (
    <div className="ts-col">
      <BrandMark />
      <div className="lg-card">
        <h1 className="lg-titulo" id={titleId}>
          {CHANGE_PASSWORD_TITLE}
        </h1>
        <p className={model.email ? "lg-apoio lg-apoio--conta" : "lg-apoio"}>{CHANGE_PASSWORD_SUPPORT}</p>
        {model.email ? (
          <p className="lg-conta" id={accountId} data-conta="">
            Entrando como <b>{model.email}</b>
          </p>
        ) : null}
        {model.banner ? <ChangePasswordErrorBanner text={model.banner} /> : null}
        <form
          noValidate
          aria-labelledby={titleId}
          aria-describedby={model.email ? accountId : undefined}
          aria-busy={model.submitting ? true : undefined}
          onSubmit={(event) => {
            event.preventDefault();
            model.onSubmit();
          }}
        >
          <input type="email" name="username" autoComplete="username" value={model.email} readOnly hidden />
          {children}
        </form>
        <button type="button" className="lg-btn2" disabled={model.submitting} onClick={model.onSignOut}>
          Sair
        </button>
      </div>
    </div>
  );
}

/** Campo de senha com "Mostrar" (botão alternável com rótulo acessível e `aria-pressed`, alvo de 34 px como o da referência). */
export function ChangePasswordInput({
  model,
  idPrefix,
  field,
  describedBy,
  readOnly = false,
  invalid = false,
}: {
  readonly model: ChangePasswordViewModel;
  readonly idPrefix: string;
  readonly field: ChangePasswordField;
  readonly describedBy?: string;
  readonly readOnly?: boolean;
  readonly invalid?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = `${idPrefix}-${field}`;
  const disabled = model.submitting || model.locked;
  const focusRequest = model.focusRequest;

  useEffect(() => {
    if (focusRequest?.field === field) inputRef.current?.focus();
  }, [focusRequest, field]);

  return (
    <div className="lg-senha">
      <input
        ref={inputRef}
        className="lg-input"
        id={id}
        name={field}
        type={visible ? "text" : "password"}
        autoComplete={FIELD_AUTOCOMPLETE[field]}
        autoCapitalize="none"
        spellCheck={false}
        placeholder="••••••••"
        value={model.values[field]}
        onChange={(event) => model.onChange(field, event.target.value)}
        aria-describedby={describedBy}
        aria-invalid={invalid ? true : undefined}
        readOnly={readOnly}
        disabled={disabled}
      />
      <button
        type="button"
        className="lg-olho"
        aria-label={FIELD_SHOW_LABELS[field]}
        aria-pressed={visible}
        aria-controls={id}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" focusable="false" /> : <Eye size={18} aria-hidden="true" focusable="false" />}
      </button>
    </div>
  );
}

export function ChangePasswordFieldBlock({
  model,
  idPrefix,
  field,
  last = false,
  describedBy,
  invalid = false,
  after,
}: {
  readonly model: ChangePasswordViewModel;
  readonly idPrefix: string;
  readonly field: ChangePasswordField;
  readonly last?: boolean;
  readonly describedBy?: string;
  readonly invalid?: boolean;
  readonly after?: ReactNode;
}) {
  return (
    <div className={last ? "lg-campo lg-campo--ultimo" : "lg-campo"}>
      <label className="lg-rotulo" htmlFor={`${idPrefix}-${field}`}>
        {FIELD_LABELS[field]}
      </label>
      <ChangePasswordInput model={model} idPrefix={idPrefix} field={field} describedBy={describedBy} invalid={invalid} />
      {after}
    </div>
  );
}

/** A dica de T.1, igual nas 3 aparências. */
export function ChangePasswordHint({ id, className = "lg-dica" }: { readonly id: string; readonly className?: string }) {
  return (
    <p className={className} id={id}>
      Use pelo menos 8 caracteres, diferente do seu <span className="nw">e-mail</span> e da senha provisória.
    </p>
  );
}

export function ChangePasswordSubmit({ model }: { readonly model: ChangePasswordViewModel }) {
  return (
    <button type="submit" className={model.submitting ? "lg-btn is-carregando" : "lg-btn"} disabled={model.submitting || model.locked}>
      {model.submitting ? (
        <>
          <span className="lg-spin" aria-hidden="true" />
          <span>Salvando…</span>
        </>
      ) : (
        <span>Salvar nova senha</span>
      )}
    </button>
  );
}

export function ChangePasswordViewA({ model }: ChangePasswordViewProps) {
  const prefix = "wa";

  return (
    <main data-aparencia="A" className="troca-senha">
      <ChangePasswordBaseStyles />
      <ChangePasswordCard model={model} idPrefix={prefix}>
        <ChangePasswordFieldBlock model={model} idPrefix={prefix} field="current" invalid={model.invalidCurrent} />
        <ChangePasswordFieldBlock model={model} idPrefix={prefix} field="next" describedBy={`${prefix}-dica`} />
        <ChangePasswordFieldBlock model={model} idPrefix={prefix} field="confirm" last />
        <ChangePasswordHint id={`${prefix}-dica`} />
        <ChangePasswordSubmit model={model} />
      </ChangePasswordCard>
    </main>
  );
}
