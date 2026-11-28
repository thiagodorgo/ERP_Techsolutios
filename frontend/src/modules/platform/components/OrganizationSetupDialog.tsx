import { useCallback, useEffect, useRef, useState } from "react";

import { Modal } from "../../../components/ui";
import { ApiError } from "../../../services/api/client";
import { todayInSaoPaulo } from "../cloud-billing/cloud-billing.service";
import {
  getPlatformBillingProfile,
  getPlatformSubscription,
  listPlatformPlans,
  putPlatformBillingProfile,
  putPlatformSubscription,
} from "../platform.service";
import type { PlatformBillingProfileInput, PlatformCatalogPlan, PlatformOrganization } from "../platform.types";

type ProfileRead = "loading" | "ready" | "forbidden" | "error";
type PlanRead = "loading" | "absent" | "present" | "error";

function editableProfile(value: PlatformBillingProfileInput): PlatformBillingProfileInput {
  return {
    legalName: value.legalName,
    document: value.document,
    email: value.email,
    address: { ...value.address },
    paymentMethod: value.paymentMethod,
  };
}

type Props = {
  readonly organization: PlatformOrganization;
  readonly item: "plan" | "profile";
  readonly onClose: () => void;
  readonly onChanged: () => void | Promise<void>;
  readonly permissions: readonly string[];
};

export function OrganizationSetupDialog({ organization, item, onClose, onChanged, permissions }: Props) {
  const [plans, setPlans] = useState<readonly PlatformCatalogPlan[]>([]);
  const [planCode, setPlanCode] = useState("");
  const [planRead, setPlanRead] = useState<PlanRead>("loading");
  const [profile, setProfile] = useState<PlatformBillingProfileInput | null>(null);
  const [profileRead, setProfileRead] = useState<ProfileRead>("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const profileGeneration = useRef(0);
  const planGeneration = useRef(0);
  const profileInFlight = useRef(false);
  const planInFlight = useRef(false);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  const canReadBilling = permissions.includes("platform:billing:read");
  const canManageBilling = permissions.includes("platform:billing:manage");

  const loadProfile = useCallback(async (keepNotice = false) => {
    const cycle = ++profileGeneration.current;
    setProfileRead("loading");
    setProfile(null);
    if (!keepNotice) setNotice(null);
    if (!canReadBilling || !canManageBilling) {
      if (cycle === profileGeneration.current) setProfileRead("forbidden");
      return;
    }
    try {
      const value = await getPlatformBillingProfile(organization.id);
      if (cycle !== profileGeneration.current) return;
      setProfile(editableProfile(value));
      setProfileRead("ready");
    } catch (error) {
      if (cycle !== profileGeneration.current) return;
      setProfileRead(error instanceof ApiError && error.status === 403 ? "forbidden" : "error");
    }
  }, [canManageBilling, canReadBilling, organization.id]);

  const loadPlan = useCallback(async (keepNotice = false) => {
    const cycle = ++planGeneration.current;
    setPlanRead("loading");
    if (!keepNotice) setNotice(null);
    if (!canReadBilling || !canManageBilling) {
      if (cycle === planGeneration.current) setPlanRead("error");
      return;
    }
    try {
      const presence = await getPlatformSubscription(organization.id);
      if (cycle !== planGeneration.current) return;
      setPlanRead(presence);
      if (presence === "present") {
        await onChangedRef.current();
        return;
      }
      const catalog = await listPlatformPlans();
      if (cycle !== planGeneration.current) return;
      setPlans(catalog.filter((plan) => plan.active && plan.currentVersion));
    } catch {
      if (cycle === planGeneration.current) setPlanRead("error");
    }
  }, [canManageBilling, canReadBilling, organization.id]);

  useEffect(() => {
    if (item === "profile") void loadProfile();
    else void loadPlan();
    return () => {
      profileGeneration.current += 1;
      planGeneration.current += 1;
    };
  }, [item, loadPlan, loadProfile]);

  const canSaveProfile = profileRead === "ready" && profile !== null && !sending;
  const canLinkPlan = planRead === "absent" && planCode !== "" && !sending;

  async function saveProfile() {
    if (profileInFlight.current) return;
    if (!canSaveProfile) return;
    profileInFlight.current = true;
    setSending(true);
    setNotice(null);
    try {
      const saved = await putPlatformBillingProfile(organization.id, profile);
      setProfile(editableProfile(saved));
      setProfileRead("ready");
      setNotice(saved.complete ? "Dados da empresa salvos." : "Dados da empresa salvos. Ainda faltam campos para concluir o cadastro.");
      await onChangedRef.current();
    } catch (error) {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        setNotice("Não foi possível salvar os dados da empresa. Nada foi alterado.");
      } else {
        setNotice("Não foi possível confirmar se os dados foram salvos. Recarregue os dados antes de tentar de novo.");
        await loadProfile(true);
      }
    } finally {
      profileInFlight.current = false;
      setSending(false);
    }
  }

  async function linkPlan() {
    if (planInFlight.current) return;
    if (!canLinkPlan) return;
    planInFlight.current = true;
    setSending(true);
    setNotice(null);
    try {
      let presence: "absent" | "present";
      try {
        presence = await getPlatformSubscription(organization.id);
      } catch {
        setNotice("Não foi possível confirmar a assinatura. Nada foi alterado.");
        return;
      }
      if (presence !== "absent") { setPlanRead("present"); return; }
      try {
        await putPlatformSubscription(organization.id, planCode, todayInSaoPaulo());
        setPlanRead("present");
        setNotice("Plano ligado.");
        await onChangedRef.current();
      } catch (error) {
        if (error instanceof ApiError && error.status === 422 && error.reason === "subscription_retroactive") {
          try {
            const afterRefusal = await getPlatformSubscription(organization.id);
            if (afterRefusal === "present") {
              setPlanRead("present");
              await onChangedRef.current();
            } else {
              setNotice("Não foi possível ligar o plano: a data deste computador não bate com a do servidor. Nada foi alterado.");
            }
          } catch {
            setNotice("Não foi possível confirmar a assinatura. Nada foi alterado.");
          }
        } else if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          setNotice("Não foi possível ligar o plano. Nada foi alterado.");
        } else {
          setNotice("Não foi possível confirmar se o plano foi ligado. Atualize os dados antes de tentar de novo.");
          await loadPlan(true);
        }
      }
    } finally {
      planInFlight.current = false;
      setSending(false);
    }
  }

  function updateProfile(patch: Partial<PlatformBillingProfileInput>) {
    setProfile((current) => current ? { ...current, ...patch } : current);
  }

  function updateAddress(key: keyof PlatformBillingProfileInput["address"], value: string) {
    setProfile((current) => current ? { ...current, address: { ...current.address, [key]: value || null } } : current);
  }

  const profileContent = profileRead === "loading" ? <p>Carregando os dados da empresa…</p>
    : profileRead === "forbidden" ? <p>Seu perfil não consulta os dados de cobrança desta organização.</p>
      : profileRead === "error" ? <><p>Não foi possível carregar os dados da empresa. Nada pode ser salvo sem essa leitura.</p><button type="button" className="pat-btn" onClick={() => void loadProfile()}>Tentar novamente</button></>
        : profile ? <>
          <label className="ui-field"><span>Razão social</span><input className="ui-input" value={profile.legalName ?? ""} onChange={(event) => updateProfile({ legalName: event.currentTarget.value || null })} /></label>
          <label className="ui-field"><span>Documento</span><input className="ui-input" value={profile.document ?? ""} onChange={(event) => updateProfile({ document: event.currentTarget.value || null })} /></label>
          <label className="ui-field"><span>E-mail de cobrança</span><input className="ui-input" value={profile.email ?? ""} onChange={(event) => updateProfile({ email: event.currentTarget.value || null })} /></label>
          <label className="ui-field"><span>CEP</span><input className="ui-input" value={profile.address.postalCode ?? ""} onChange={(event) => updateAddress("postalCode", event.currentTarget.value)} /></label>
          <label className="ui-field"><span>Logradouro</span><input className="ui-input" value={profile.address.street ?? ""} onChange={(event) => updateAddress("street", event.currentTarget.value)} /></label>
          <label className="ui-field"><span>Número</span><input className="ui-input" value={profile.address.number ?? ""} onChange={(event) => updateAddress("number", event.currentTarget.value)} /></label>
          <label className="ui-field"><span>Bairro</span><input className="ui-input" value={profile.address.district ?? ""} onChange={(event) => updateAddress("district", event.currentTarget.value)} /></label>
          <label className="ui-field"><span>Cidade</span><input className="ui-input" value={profile.address.city ?? ""} onChange={(event) => updateAddress("city", event.currentTarget.value)} /></label>
          <label className="ui-field"><span>Código IBGE</span><input className="ui-input" value={profile.address.cityIbge ?? ""} onChange={(event) => updateAddress("cityIbge", event.currentTarget.value)} /></label>
          <label className="ui-field"><span>UF</span><input className="ui-input" value={profile.address.state ?? ""} onChange={(event) => updateAddress("state", event.currentTarget.value)} /></label>
          <label className="ui-field"><span>Forma de pagamento</span><select className="ui-input" value={profile.paymentMethod} onChange={(event) => updateProfile({ paymentMethod: event.currentTarget.value as PlatformBillingProfileInput["paymentMethod"] })}><option value="undefined">Não definida</option><option value="pix">Pix</option><option value="boleto">Boleto</option><option value="credit_card">Cartão de crédito</option><option value="debit_card">Cartão de débito</option></select></label>
          <p>Pode salvar incompleto: a filial continua como cadastro incompleto até preencher tudo.</p>
        </> : null;

  const planContent = planRead === "loading" ? <p>Consultando a assinatura…</p>
    : planRead === "present" ? <p>Esta organização já tem plano contratado. A troca de plano não é feita por esta tela.</p>
      : planRead === "error" ? <><p>Não foi possível consultar a assinatura. Nada pode ser alterado sem essa leitura.</p><button type="button" className="pat-btn" onClick={() => void loadPlan()}>Tentar novamente</button></>
        : <><label className="ui-field"><span>Plano</span><select className="ui-input" value={planCode} onChange={(event) => setPlanCode(event.currentTarget.value)}><option value="">Selecione</option>{plans.map((plan) => <option key={plan.id} value={plan.code}>{plan.name}</option>)}</select></label><button type="button" className="pat-btn" disabled={!canLinkPlan} onClick={() => void linkPlan()}>Ligar o plano</button></>;

  return <Modal title={`${item === "plan" ? "Escolher plano" : "Dados da empresa"} · ${organization.name}`} open onClose={onClose} size="lg">
    <section>{item === "plan" ? planContent : <>{profileContent}{profileRead === "ready" && profile ? <button type="button" className="pat-btn" disabled={!canSaveProfile} onClick={() => void saveProfile()}>Salvar dados da empresa</button> : null}</>}</section>
    {notice ? <div role="status" className="ui-alert ui-alert--info">{notice}</div> : null}
    <div className="platform-organizations__dialog-actions"><button type="button" className="pat-btn" onClick={onClose}>Fechar</button></div>
  </Modal>;
}
