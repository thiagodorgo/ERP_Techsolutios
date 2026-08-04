import type { ReactNode } from "react";

// PR-A TELAS PADRONIZADAS — cabeçalho de página do padrão transversal
// (fonte: "ERP Web - Telas Padronizadas.dc.html" + docs/juntas/J-TELAS-PADRONIZADAS.md §1).
// kicker = GRUPO do menu em caixa alta ("VISÃO GERAL", "OPERAÇÃO"…); ações à direita
// (botões .pat-btn / .pat-btn--primary). Layout e tokens nas classes .pat-page-header* (app.css).

export type PageHeaderProps = {
  /** Grupo do menu em caixa alta (ex.: "VISÃO GERAL"). */
  kicker: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Ações à direita (seletores + botão primário). */
  actions?: ReactNode;
};

export function PageHeader({ kicker, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="pat-page-header">
      <div className="pat-page-header__lead">
        <div className="pat-page-header__kicker">{kicker}</div>
        <h1 className="pat-page-header__title">{title}</h1>
        {subtitle ? <p className="pat-page-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="pat-page-header__actions">{actions}</div> : null}
    </header>
  );
}
