import { useCallback, useRef, useState } from "react";
import { Navigate } from "react-router-dom";

import { useScreenAppearance, type Appearance } from "../modules/appearance";
import {
  newPasswordRuleChecks,
  PASSWORD_CHANGE_MESSAGES,
  PASSWORD_CONFIRMATION_MISMATCH_MESSAGE,
  PasswordChangeError,
  type PasswordChangeFailure,
} from "../modules/auth/auth.adapter";
import { changeOwnPassword } from "../modules/auth/auth.service";
import { useAuth } from "../providers/AuthProvider";
import {
  ChangePasswordViewA,
  type ChangePasswordField,
  type ChangePasswordFocusRequest,
  type ChangePasswordViewModel,
} from "./change-password/ChangePasswordViewA";
import { ChangePasswordViewB } from "./change-password/ChangePasswordViewB";
import { ChangePasswordViewC } from "./change-password/ChangePasswordViewC";

// B-USERS-ACESSO-SEG (T1) — troca da senha provisória na web. CONTÊINER das 3 aparências aprovadas
// (`screen-refs/troca-senha-3opcoes.reference.html`: A · Padrão fiel, B · Com guia, C · Em duas etapas), no padrão dos
// contêineres de aparência (`modules/work-orders/pages/WorkOrdersPage.tsx`): monta UM modelo e entrega a uma view pura.
// Tela-modelo: `pages/LoginPage.tsx`. Fora do menu e da barra de cima, como o login.
// Fluxo (plano do conserto do #527, T.1): quem entra com a senha provisória vem direto para cá e nenhuma outra tela abre
// (o `AuthProvider` não conta a sessão restrita como autenticada); "Sair" encerra a sessão; o 200 revoga todas as sessões
// do par, apaga a sessão local e volta ao login com o aviso; 401 de sessão vencida volta ao login com o aviso dela.
// Segurança: as senhas ficam só no estado desta tela (memória); nada vai ao navegador, a log ou a telemetria; a mensagem
// do servidor nunca aparece (o texto vem do mapa fixo, por status e motivo); UMA requisição por tentativa (RQ-6).

export const CHANGE_PASSWORD_APPEARANCE_KEY = "troca-senha";

/**
 * Emenda 4, item 3 (decisão do dono de 10/11: "Sim, sempre na A"): a sessão restrita abre SEMPRE na A, sem aplicar a
 * preferência guardada (ela nem tem organização ativa nem o seletor; uma organização velha no navegador não muda isso).
 * As 3 aparências ficam registradas; B e C só valeriam numa troca feita em sessão inteira, que não é deste bloco.
 */
export function resolveChangePasswordAppearance(restricted: boolean, preferred: Appearance): Appearance {
  return restricted ? "A" : preferred;
}

/**
 * Validação local (espelha o servidor; quem decide é o backend): o texto fixo do primeiro problema e o campo que recebe
 * o foco depois do envio, ou `null`.
 */
export function validatePasswordChange(
  values: Readonly<Record<ChangePasswordField, string>>,
  email: string,
): { readonly message: string; readonly field: ChangePasswordField } | null {
  const empty = (["current", "next", "confirm"] as const).find((field) => !values[field]);
  if (empty) return { message: PASSWORD_CHANGE_MESSAGES.invalid_payload, field: empty };

  const rules = newPasswordRuleChecks(values.next, values.current, email);
  if (!rules.longEnough || !rules.differsFromEmail || !rules.differsFromCurrent) {
    return { message: PASSWORD_CHANGE_MESSAGES.invalid_new_password, field: "next" };
  }

  if (values.confirm !== values.next) return { message: PASSWORD_CONFIRMATION_MISMATCH_MESSAGE, field: "confirm" };

  return null;
}

/** Aviso que o login mostra quando a troca termina fora daqui (estado da navegação, nunca a URL). */
export type LoginNotice = "senha-alterada" | "sessao-expirada";

type FormState =
  | { readonly status: "idle" }
  | { readonly status: "submitting" }
  | { readonly status: "rejected"; readonly message: string }
  | { readonly status: "failed"; readonly failure: PasswordChangeFailure; readonly message: string };

const EMPTY_VALUES: Readonly<Record<ChangePasswordField, string>> = { current: "", next: "", confirm: "" };

/** Acesso não permitido (T.1): tentar de novo não resolve, o formulário trava e fica só "Sair". */
const LOCKING_FAILURES: ReadonlySet<PasswordChangeFailure> = new Set(["user_inactive", "credential_unavailable"]);

export type ChangePasswordFormModel = ChangePasswordViewModel & {
  /** Aviso que o login mostra quando a sessão some no fim da troca (200 ou sessão vencida). */
  readonly exitNotice: LoginNotice | null;
};

/**
 * O estado e o fluxo da troca, iguais nas 3 aparências (a C usa também a etapa). A saída da tela é sempre pela sessão que
 * some (o 200 apaga a sessão local; sessão vencida e "Sair" chamam o `signOut`), e o contêiner leva ao login com o aviso:
 * a navegação do roteador é uma transição e a sessão que some é atualização comum, então a tela renderiza primeiro "sem
 * sessão" e é esse redirecionamento que tem de levar o aviso, marcado no MESMO passo em que a sessão some (medido no
 * `troca-senha-live`, W5: com o aviso marcado depois do `await`, o login abria sem ele).
 */
export function useChangePasswordForm(email: string, appearance: Appearance): ChangePasswordFormModel {
  const { signOut } = useAuth();
  const [values, setValues] = useState<Readonly<Record<ChangePasswordField, string>>>(EMPTY_VALUES);
  const [state, setState] = useState<FormState>({ status: "idle" });
  const [invalidCurrent, setInvalidCurrent] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [focusRequest, setFocusRequest] = useState<ChangePasswordFocusRequest | null>(null);
  const [exitNotice, setExitNotice] = useState<LoginNotice | null>(null);
  const inFlight = useRef(false);

  const locked = state.status === "failed" && LOCKING_FAILURES.has(state.failure);
  const submitting = state.status === "submitting";

  const requestFocus = useCallback((field: ChangePasswordField) => {
    setFocusRequest((previous) => ({ field, seq: (previous?.seq ?? 0) + 1 }));
  }, []);

  const onChange = useCallback((field: ChangePasswordField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (field === "current") setInvalidCurrent(false);
  }, []);

  const submit = useCallback(async () => {
    inFlight.current = true;
    setState({ status: "submitting" });

    try {
      // O aviso é marcado no mesmo passo em que a sessão some (dentro do serviço), para sair junto no redirecionamento.
      await changeOwnPassword({ currentPassword: values.current, newPassword: values.next }, { onChanged: () => setExitNotice("senha-alterada") });
    } catch (error) {
      const failure: PasswordChangeFailure = error instanceof PasswordChangeError ? error.failure : "unavailable";
      const message = error instanceof PasswordChangeError ? error.message : PASSWORD_CHANGE_MESSAGES.unavailable;

      if (failure === "session_expired") {
        // Dados desatualizados (token restrito vencido): encerra a sessão e volta ao login com o aviso. Sem refresh (RQ-6).
        setExitNotice("sessao-expirada");
        signOut();
        return;
      }

      setState({ status: "failed", failure, message });

      if (failure === "invalid_credentials") {
        // A provisória fica marcada e vazia; a nova senha já digitada fica (na C, a etapa 1 reabre).
        setValues((current) => ({ ...current, current: "" }));
        setInvalidCurrent(true);
        setStep(1);
        requestFocus("current");
      }
    } finally {
      inFlight.current = false;
    }
  }, [requestFocus, signOut, values.current, values.next]);

  const onSubmit = useCallback(() => {
    if (inFlight.current || submitting || locked) return;

    if (appearance === "C" && step === 1) {
      if (!values.current) {
        setState({ status: "rejected", message: PASSWORD_CHANGE_MESSAGES.invalid_payload });
        setInvalidCurrent(true);
        requestFocus("current");
        return;
      }
      setState({ status: "idle" });
      setStep(2);
      requestFocus("next");
      return;
    }

    const problem = validatePasswordChange(values, email);
    if (problem) {
      setAttempted(true);
      setState({ status: "rejected", message: problem.message });
      requestFocus(problem.field);
      return;
    }

    void submit();
  }, [appearance, email, locked, requestFocus, step, submit, submitting, values]);

  const onEditCurrent = useCallback(() => {
    if (submitting || locked) return;
    setStep(1);
    requestFocus("current");
  }, [locked, requestFocus, submitting]);

  const onSignOut = useCallback(() => {
    if (inFlight.current) return;
    signOut();
  }, [signOut]);

  return {
    email,
    values,
    onChange,
    onSubmit,
    onSignOut,
    submitting,
    locked,
    banner: state.status === "rejected" || state.status === "failed" ? state.message : null,
    invalidCurrent,
    attempted,
    step,
    onEditCurrent,
    focusRequest,
    exitNotice,
  };
}

export function ChangePasswordView({ appearance, model }: { readonly appearance: Appearance; readonly model: ChangePasswordViewModel }) {
  if (appearance === "B") return <ChangePasswordViewB model={model} />;
  if (appearance === "C") return <ChangePasswordViewC model={model} />;
  return <ChangePasswordViewA model={model} />;
}

export function ChangePasswordPage() {
  const { session, isLoading, passwordChangeRequired } = useAuth();
  const { appearance: preferred } = useScreenAppearance(CHANGE_PASSWORD_APPEARANCE_KEY);
  const appearance = resolveChangePasswordAppearance(passwordChangeRequired, preferred);
  const model = useChangePasswordForm(session?.user.email ?? "", appearance);

  if (isLoading) return null;
  // Sem sessão → login (com o aviso, quando a troca terminou aqui); sessão INTEIRA → o início (T.2). O mesmo teste
  // `=== true` do desvio do login (RQ-1).
  if (!session) return <Navigate to="/login" replace state={model.exitNotice ? { aviso: model.exitNotice } : undefined} />;
  if (session.mustChangePassword !== true) return <Navigate to="/select-context" replace />;

  return <ChangePasswordView appearance={appearance} model={model} />;
}
