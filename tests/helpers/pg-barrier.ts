import assert from "node:assert/strict";

// -----------------------------------------------------------------------------------------------
// B-O6R-02 ciclo 2 · C3 (fecha B-5 da J-B-O6R-02-ciclo1) — BARREIRA ESCOPADA À PRÓPRIA SUÍTE.
//
// O defeito medido pela junta: quatro das cinco suítes `-db` esperavam por um statement bloqueado
// consultando `pg_stat_activity` CLUSTER-WIDE (`pid <> pg_backend_pid() AND wait_event_type='Lock'`),
// e se autodenominavam "barreira DETERMINÍSTICA". O job da CI roda `node --test` sobre 29 arquivos, e
// o runner paraleliza arquivos em PROCESSOS — logo um backend de OUTRA suíte, bloqueado por motivo
// nenhum relacionado, satisfaz a barreira e o teste segue achando que o seu perdedor travou.
//
// P4 (a propriedade que faltava): *a barreira de uma suíte só é satisfeita por statement de conexões
// da PRÓPRIA suíte*. O escopo é o `application_name`: cada suíte carimba um nome único
// (`o6r-<slug>-<pid>`) na `DATABASE_URL` ANTES de qualquer import da aplicação — medido em runtime:
// `src/database/prisma.ts` lê `process.env.DATABASE_URL` no import e repassa ao `PrismaPg`/node-pg,
// que honra `application_name` da URL; `node --test` dá um processo por arquivo, então tag por
// processo = tag por suíte. `assertApplicationNamePropagated` prova isso na 1ª execução, dentro da
// própria suíte — a barreira nunca depende de uma promessa não verificada.
//
// O controle negativo permanente vive em `tests/pg-barrier-scoped-db.test.ts`: duas conexões CRUAS
// (sem a tag) criam um statement realmente bloqueado, e a barreira escopada RECUSA-O. Remover o
// filtro `application_name` daqui (drill D14) põe esse controle no vermelho.
// -----------------------------------------------------------------------------------------------

export type PgQueryClient = {
  $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
};

const DEFAULT_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 25;

/** Nome único por PROCESSO — `node --test` roda um processo por arquivo, logo é único por suíte. */
export function buildApplicationName(slug: string): string {
  return `o6r-${slug}-${process.pid}`;
}

/**
 * Carimba `application_name` na connection string. Preserva os demais parâmetros (`schema`, etc.):
 * a URL do repositório já traz `?schema=public`, e sobrescrevê-la quebraria o cliente.
 */
export function withApplicationName(connectionString: string, applicationName: string): string {
  const url = new URL(connectionString);
  url.searchParams.set("application_name", applicationName);
  return url.toString();
}

/**
 * Prova, contra o backend de verdade, que a tag CHEGOU. Sem isto a barreira escopada poderia ficar
 * verde por nunca casar nada — um "determinístico" que é só um timeout que não aconteceu.
 */
export async function assertApplicationNamePropagated(client: PgQueryClient, applicationName: string): Promise<void> {
  const rows = (await client.$queryRaw`
    SELECT application_name AS name FROM pg_stat_activity WHERE pid = pg_backend_pid()
  `) as Array<{ name: string }>;
  assert.equal(
    rows[0]?.name,
    applicationName,
    `o application_name da suíte não chegou ao backend (observado: ${JSON.stringify(rows[0]?.name)}). ` +
      "Sem ele a barreira escopada não tem como distinguir a própria fila da fila alheia.",
  );
}

/**
 * Quantos statements estão BLOQUEADOS num lock, com o texto tocando `fragment`. Quando
 * `applicationName` é passado, conta só as conexões daquela suíte; sem ele, conta o cluster inteiro
 * (é assim que o controle negativo prova que o decoy existe de fato antes de exigir que a barreira
 * escopada o recuse).
 */
export async function countBlockedStatements(
  client: PgQueryClient,
  options: { readonly fragment: string; readonly applicationName?: string },
): Promise<number> {
  const like = `%${options.fragment}%`;
  const rows = (await client.$queryRaw`
    SELECT count(*)::int AS waiting
    FROM pg_stat_activity
    WHERE pid <> pg_backend_pid()
      AND wait_event_type = 'Lock'
      AND state = 'active'
      AND query ILIKE ${like}
      AND (${options.applicationName ?? null}::text IS NULL OR application_name = ${options.applicationName ?? null}::text)
  `) as Array<{ waiting: number }>;
  return rows[0]?.waiting ?? 0;
}

/**
 * Espera um statement bloqueado DA PRÓPRIA SUÍTE (mesmo `application_name`, pid distinto do meu).
 * O timeout reporta quantos bloqueios existiam no cluster — assim "ninguém bloqueou" e "bloqueou
 * gente que não é minha" chegam com diagnósticos diferentes ao lugar de falha.
 */
export async function waitForOwnBlockedStatement(
  client: PgQueryClient,
  options: {
    readonly applicationName: string;
    readonly fragment: string;
    readonly label: string;
    readonly timeoutMs?: number;
  },
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const startedAt = Date.now();
  const deadline = startedAt + timeoutMs;
  for (;;) {
    const own = await countBlockedStatements(client, { fragment: options.fragment, applicationName: options.applicationName });
    if (own >= 1) {
      // PUBLICA quanto esperou (B-O6R-04a · bateria). Sem este número, "quanto falta para o teto da
      // barreira estourar" não era observável: o plano teve de LIMITAR a espera pela duração total do
      // teste (2.265 ms de um teto de 3.000 sob carga) e registrar a margem como PISO, não medida.
      const waited = Date.now() - startedAt;
      const margin = waited <= 0 ? `> ${timeoutMs}` : (timeoutMs / waited).toFixed(1);
      console.log(`[barreira] ${options.label}: bloqueio da própria suíte visto em ${waited} ms (teto ${timeoutMs} ms · margem ${margin}x)`);
      return;
    }
    if (Date.now() > deadline) {
      const clusterWide = await countBlockedStatements(client, { fragment: options.fragment });
      assert.fail(
        `timeout esperando statement bloqueado em ${options.fragment} para ${options.applicationName} — ${options.label} ` +
          `(bloqueios no cluster inteiro com esse texto: ${clusterWide})`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Espera `minWaiters` na FILA do advisory lock `hashtext(lockKey)` (int8 → classid = 32 bits altos,
 * objid = 32 baixos, objsubid = 1), contando SÓ as conexões da própria suíte. A chave já é
 * tenant+competência, mas `hashtext` colide entre pares distintos — o escopo por `application_name`
 * fecha também essa porta, e de graça.
 */
export async function waitForOwnAdvisoryWaiters(
  client: PgQueryClient,
  options: {
    readonly applicationName: string;
    readonly lockKey: string;
    readonly minWaiters: number;
    readonly label: string;
    readonly timeoutMs?: number;
  },
): Promise<void> {
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  for (;;) {
    const rows = (await client.$queryRaw`
      SELECT count(*)::int AS waiting
      FROM pg_locks l
      JOIN pg_stat_activity a ON a.pid = l.pid
      WHERE l.locktype = 'advisory'
        AND l.granted = false
        AND l.objsubid = 1
        AND l.classid::bigint = ((hashtext(${options.lockKey})::bigint >> 32) & 4294967295)
        AND l.objid::bigint = (hashtext(${options.lockKey})::bigint & 4294967295)
        AND a.application_name = ${options.applicationName}
    `) as Array<{ waiting: number }>;
    if ((rows[0]?.waiting ?? 0) >= options.minWaiters) return;
    if (Date.now() > deadline) {
      assert.fail(
        `timeout esperando ${options.minWaiters} waiter(s) na trava de período para ${options.applicationName} — ${options.label}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * CAPTURA-LIQUIDADA (o outro lado do B-5). Uma promessa segurada através de `await`s pode liquidar
 * ANTES de o teste anexar o handler de rejeição — e nada ordena os dois eventos; foi assim que
 * `financial-entry-reverse-restore-db` derrubou o lote com `unhandledRejection`. Aqui o handler é
 * anexado NA CRIAÇÃO: a promessa devolvida NUNCA rejeita, e a razão exata continua exigida, agora
 * lida do outcome capturado.
 */
export type SettledOutcome<T> = { readonly status: "fulfilled"; readonly value: T } | { readonly status: "rejected"; readonly reason: unknown };

export function captureSettled<T>(promise: Promise<T>): Promise<SettledOutcome<T>> {
  return promise.then(
    (value) => ({ status: "fulfilled", value }) as const,
    (reason: unknown) => ({ status: "rejected", reason }) as const,
  );
}

/** A razão exata do lado que PERDEU — falha com diagnóstico se ele tiver vencido. */
export function expectRejected<T>(outcome: SettledOutcome<T>, label: string): unknown {
  assert.equal(outcome.status, "rejected", `${label}: era para ter falhado e passou`);
  return (outcome as { readonly status: "rejected"; readonly reason: unknown }).reason;
}

/**
 * O outro lado: o que tinha de liquidar limpo liquidou. Carrega a RAZÃO na mensagem — um
 * `expected 'fulfilled', actual 'rejected'` sem o erro original manda o leitor caçar às cegas.
 */
export function expectAllFulfilled(outcomes: ReadonlyArray<SettledOutcome<unknown>>, label: string): void {
  const rejected = outcomes.filter((outcome): outcome is { status: "rejected"; reason: unknown } => outcome.status === "rejected");
  assert.deepEqual(
    rejected.map((outcome) => String((outcome.reason as { message?: unknown })?.message ?? outcome.reason)),
    [],
    `${label}: promessa(s) que deveriam liquidar limpo rejeitaram`,
  );
}

// -----------------------------------------------------------------------------------------------
// B-O6R-04a · bateria — PORTÃO DE UNIDADE (ADITIVO: nenhuma função acima foi alterada).
//
// O DEFEITO QUE ELE FECHA. As suítes `-db` do estoque encontravam-se POR RELÓGIO: lançavam A, dormiam
// um tempo FIXO *torcendo* para que A já tivesse chegado ao lock, e só então lançavam B — enquanto A
// segurava a transação por outro tempo fixo (`sleep(1500)`), torcendo para que B já estivesse
// bloqueado. São duas apostas contra o relógio de parede, pagas com o orçamento de 5 s da transação
// do produto. Sob carga a aposta perde: se A se atrasar mais que o sono, os papéis se INVERTEM (B
// pega o lock, A bloqueia atrás dele) e a barreira estoura acusando "deadlock/timeout" — um
// diagnóstico que culpa o PRODUTO por uma conta que o TESTE pagou.
//
// A PROPRIEDADE. O portão troca as duas apostas por CAUSALIDADE: o gancho SINALIZA que chegou
// (`arrived`), e o refém só sai quando o teste SOLTA (`release()`), depois de B estar provadamente
// bloqueado. O teste não adivinha mais quando A chegou — ele é AVISADO; e não escolhe mais por quanto
// tempo A segura — ele SOLTA. É o mesmo desenho que `tests/financial-pay-title-atomic-db.test.ts` já
// usa nas suítes de dinheiro (`winnerReady` + `winnerMayCommit`), sem um único `sleep`.
//
// POR QUE COM TETO. Trocar um `sleep` por espera INFINITA seria piorar: o runner não passa
// `--test-timeout` (pendência `P-RUNNER-SEM-TEST-TIMEOUT`), logo um gancho que nunca chega penduraria
// a bateria inteira — sem vermelho e sem diagnóstico. `arrived` REJEITA em `timeoutMs` dizendo quem
// não chegou, e o lote falha em vez de travar.
//
// O RESÍDUO, DECLARADO (não escondido). O portão encurta o refém ao mínimo necessário; não o torna
// grátis. Enquanto segura, a transação da unidade consome o orçamento de 5 s do `$transaction` —
// `src/database/rls.ts` o abre SEM OPÇÕES, logo o teto é o default do Prisma: IMPLÍCITO, invisível
// para quem lê e ilegível para um teste (pendência `P-RLS-TX-TIMEOUT-IMPLICITO`; nomeá-lo exigiria
// tocar `src/**`, proibido neste bloco). Por isso `release()` PUBLICA quanto do orçamento o refém
// consumiu: quando a CI ficar lenta, o TAP passa a dizer POR QUÊ em vez de acusar contenção.
// -----------------------------------------------------------------------------------------------

/** Orçamento da transação interativa do Prisma (default — `src/database/rls.ts` abre sem opções). */
const PRODUCT_TX_BUDGET_MS = 5_000;

/** Qual unidade o portão segura. Sem filtro, segura a primeira que entrar (e as seguintes passam). */
export type UnitGateMatch = { readonly itemId?: string; readonly index?: number };

/** A forma do `beforeUnitCommit` do produto (`src/modules/inventory/cycle-count.service.ts`). */
export type UnitGateHook = (unit: { readonly index: number; readonly itemId: string }) => Promise<void>;

export type UnitGate = {
  /** Resolve quando o gancho CHEGA; REJEITA em `timeoutMs` (espera infinita penduraria o lote). */
  readonly arrived: Promise<void>;
  /** Solta o refém e PUBLICA quanto do orçamento da transação ele consumiu. Idempotente. */
  release(): void;
  /** Quanto o refém segurou, em ms; `undefined` enquanto não soltou (ou se soltou antes da chegada). */
  heldMs(): number | undefined;
  /**
   * A forma CRUA: sinaliza a chegada e aguarda `release()`. É o que `hookFor` faz por dentro, exposto
   * para os casos que NÃO passam pelo gancho do produto — por exemplo as emulações em SQL cru
   * ("CONTROLE VERMELHO"), que seguram uma transação do próprio teste.
   */
  hold(): Promise<void>;
  /** O gancho para passar em `beforeUnitCommit`: sinaliza a chegada e aguarda `release()`. */
  hookFor(match?: UnitGateMatch): UnitGateHook;
};

export function createGate(options: { readonly label: string; readonly timeoutMs?: number }): UnitGate {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let signalArrived!: () => void;
  let failArrival!: (error: Error) => void;
  let openGate!: () => void;
  let arrivedAt: number | undefined;
  let held: number | undefined;
  let released = false;

  const arrived = new Promise<void>((resolve, reject) => {
    signalArrived = resolve;
    failArrival = reject;
  });
  const timer = setTimeout(() => {
    failArrival(
      new Error(
        `portão de unidade "${options.label}": o gancho não chegou em ${timeoutMs} ms — a unidade não ` +
          "entrou na transação (item ou índice errado no hookFor?) ou o fechamento falhou antes dela",
      ),
    );
  }, timeoutMs);
  // O temporizador NÃO é `unref()`: medido nesta bancada, com ele desreferenciado o laço de
  // eventos esvazia antes de o teto disparar e o `node --test` derruba o arquivo inteiro com
  // "Promise resolution is still pending but the event loop has already resolved", CANCELANDO as
  // suítes vizinhas — troca-se um travamento por um vermelho que não nomeia a causa. Referenciado,
  // ele segura o laço até no máximo `timeoutMs` e falha DIZENDO quem não chegou. É limpo na chegada
  // e no `release()`, que são as duas saídas normais.
  // Handler anexado NA CRIAÇÃO: `arrived` nunca vira `unhandledRejection` se ninguém a esperar, e
  // quem a espera continua recebendo a rejeição (mesma disciplina do `captureSettled` acima).
  arrived.catch(() => undefined);

  const opened = new Promise<void>((resolve) => (openGate = resolve));

  // Função autônoma, não método: `hookFor` devolve um closure que a chama, e se ela fosse alcançada
  // por `this` o portão quebraria ao ser desestruturado (`const { hookFor } = gate`).
  const hold = async (): Promise<void> => {
    if (arrivedAt === undefined) {
      arrivedAt = Date.now();
      clearTimeout(timer);
      signalArrived();
    }
    await opened;
  };

  return {
    arrived,
    heldMs: () => held,
    release() {
      if (released) return;
      released = true;
      clearTimeout(timer);
      if (arrivedAt === undefined) {
        console.log(`[M2] ${options.label}: release() ANTES da chegada — o refém não chegou a segurar a transação`);
      } else {
        held = Date.now() - arrivedAt;
        const margin = held <= 0 ? "> 5000" : (PRODUCT_TX_BUDGET_MS / held).toFixed(1);
        console.log(
          `[M2] ${options.label}: refém segurou ${held} ms do orçamento de ${PRODUCT_TX_BUDGET_MS} ms da ` +
            `transação da unidade (margem ${margin}x — o trabalho da própria unidade soma a isto)`,
        );
      }
      openGate();
    },
    hold,
    hookFor(match) {
      return async (unit) => {
        if (match?.itemId !== undefined && unit.itemId !== match.itemId) return;
        if (match?.index !== undefined && unit.index !== match.index) return;
        await hold();
      };
    },
  };
}
