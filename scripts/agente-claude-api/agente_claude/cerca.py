"""A cerca: caminhos confinados ao worktree descartável e comandos por allowlist.

Por que existe: tudo o que o modelo manda é saída NÃO confiável (skill claude-api,
tool-use-concepts l.499 e l.509). Cada pedido passa por aqui ANTES de qualquer
efeito, e a cerca não depende de o modelo obedecer ao prompt (plano §3.9).

Duas metades:
- caminhos (`Raiz.resolver`): `realpath` segue junction, symlink e nome 8.3; a
  comparação é feita no caminho RESOLVIDO e em `normcase`; prefixos que sobrevivem
  ao `realpath` (UNC, `\\\\?\\`, `\\\\.\\`) e o `:` de ADS são recusados na ENTRADA,
  antes de resolver (plano §3.1, §3.10; medições F19-F24, F35).
- comandos (`validar_argv`): não existe "rodar comando". Cada ferramenta monta o
  argv ela mesma, a partir de campos tipados; flags só onde a tabela do plano §3.2
  as nomeia (allowlist por posição, nunca denylist — F25 mediu `git log --output`
  gravando arquivo e `git diff --no-index` lendo fora do repositório).
"""

from __future__ import annotations

import fnmatch
import os
import re
from dataclasses import dataclass, field
from pathlib import Path, PureWindowsPath


class CercaNegada(Exception):
    """Pedido recusado pela cerca. O motivo é curto e nunca contém conteúdo lido."""

    def __init__(self, motivo: str) -> None:
        super().__init__(motivo)
        self.motivo = motivo


# ---------------------------------------------------------------------------
# Caminhos
# ---------------------------------------------------------------------------

MAX_CHARS_CAMINHO = 400
MAX_CHARS_CAMPO = 500
_CONTROLE = ("\x00", "\n", "\r")
RESERVADOS = frozenset(
    {"CON", "PRN", "AUX", "NUL"}
    | {f"COM{i}" for i in range(1, 10)}
    | {f"LPT{i}" for i in range(1, 10)}
)
COMPONENTES_NEGADOS = frozenset({".git", "node_modules"})
PADROES_NOME_NEGADOS = (".env*", "*.pem", "*.key", "id_*")


def _tem_controle(texto: str) -> bool:
    return any(c in texto for c in _CONTROLE)


def nome_negado(nome: str) -> str | None:
    """Nome base protegido (`.env*`, `*.pem`, `*.key`, `id_*`), sem distinguir caixa.

    Casa também sem ponto/espaço final: o Win32 os ignora ao abrir, e o `realpath` só
    os remove quando o arquivo existe (medido pelo dev, refinando o F22).
    """
    n = nome.lower()
    for candidato in (n, n.rstrip(" .")):
        for padrao in PADROES_NOME_NEGADOS:
            if fnmatch.fnmatchcase(candidato, padrao):
                return f"nome protegido ({padrao})"
    return None


def componente_reservado(nome: str) -> bool:
    """Nome de dispositivo do Windows (CON, NUL, COM1...), com ou sem extensão (F23)."""
    base = nome.split(".", 1)[0].strip().upper()
    return base in RESERVADOS


class Raiz:
    """Raiz confinada. O `realpath` da raiz é gravado UMA vez, na construção (§3.1-4)."""

    def __init__(self, caminho: str | os.PathLike[str]) -> None:
        self._texto = os.fspath(caminho)
        self._real = os.path.realpath(self._texto)
        self._norm = os.path.normcase(self._real)

    @property
    def real(self) -> str:
        return self._real

    def _conferir_raiz(self) -> None:
        atual = os.path.normcase(os.path.realpath(self._texto))
        if atual != self._norm:
            raise CercaNegada("raiz do worktree mudou desde a criação")

    def resolver(self, texto: object) -> Path:
        """Devolve o caminho resolvido dentro da raiz ou levanta `CercaNegada`."""
        # 1. Entrada: recusa antes de qualquer realpath (fail-closed; F21, F22, F24).
        if not isinstance(texto, str):
            raise CercaNegada("caminho não é texto")
        if texto == "":
            raise CercaNegada("caminho vazio")
        if _tem_controle(texto):
            raise CercaNegada("caminho com caractere de controle")
        if len(texto) > MAX_CHARS_CAMINHO:
            raise CercaNegada("caminho longo demais")
        if len(texto) >= 2 and texto[0] in "\\/" and texto[1] in "\\/":
            raise CercaNegada("UNC, prefixo longo ou dispositivo")
        if any(c == ":" and i != 1 for i, c in enumerate(texto)):
            raise CercaNegada("':' fora da posição de unidade (ADS ou dispositivo)")
        # 2. Só relativo à raiz.
        puro = PureWindowsPath(texto)
        if puro.drive or puro.root or os.path.isabs(texto):
            raise CercaNegada("caminho absoluto ou de outra unidade")
        # 3-4. Resolve (segue junction, symlink, 8.3) e confere contenção.
        self._conferir_raiz()
        candidato = os.path.realpath(os.path.join(self._texto, texto))
        cand_norm = os.path.normcase(candidato)
        raiz_pura = PureWindowsPath(self._norm)
        if not PureWindowsPath(cand_norm).is_relative_to(raiz_pura):
            raise CercaNegada("fora da raiz")
        # 5. Padrões negados, sempre sobre o RESOLVIDO (F22: '.env.' vira '.env').
        relativo = PureWindowsPath(cand_norm).relative_to(raiz_pura)
        for parte in relativo.parts:
            if parte in COMPONENTES_NEGADOS or parte.rstrip(" .") in COMPONENTES_NEGADOS:
                raise CercaNegada(f"componente protegido ({parte})")
            if componente_reservado(parte):
                raise CercaNegada("nome de dispositivo reservado")
        motivo = nome_negado(PureWindowsPath(candidato).name)
        if motivo:
            raise CercaNegada(motivo)
        return Path(candidato)

    def relativo(self, resolvido: Path) -> str:
        """Caminho relativo à raiz, com '/', para passar a `git ... -- <caminho>`."""
        rel = os.path.relpath(os.fspath(resolvido), self._real)
        return rel.replace("\\", "/")


# ---------------------------------------------------------------------------
# Ambiente dos processos filhos (allowlist, construído do zero — §3.2)
# ---------------------------------------------------------------------------

_AMBIENTE_PERMITIDO = (
    "PATH",
    "SYSTEMROOT",
    "SYSTEMDRIVE",
    "WINDIR",
    "COMSPEC",
    "PATHEXT",
    "TEMP",
    "TMP",
    "USERPROFILE",
    "HOMEDRIVE",
    "HOMEPATH",
    "APPDATA",
    "LOCALAPPDATA",
    "PROGRAMDATA",
    "NUMBER_OF_PROCESSORS",
    "PROCESSOR_ARCHITECTURE",
    "NVM_HOME",
    "NVM_SYMLINK",
)
_AMBIENTE_FIXO = {
    "CI": "1",
    "NO_COLOR": "1",
    "FORCE_COLOR": "0",
    "CORE_SAAS_PERSISTENCE": "memory",
    "GIT_TERMINAL_PROMPT": "0",
    "GIT_PAGER": "cat",
    "npm_config_update_notifier": "false",
    "npm_config_fund": "false",
    "npm_config_audit": "false",
    "npm_config_progress": "false",
}
_AMBIENTE_GH = {"GH_PAGER": "cat", "GH_PROMPT_DISABLED": "1", "GH_NO_UPDATE_NOTIFIER": "1"}


def ambiente_limpo(origem: dict[str, str] | None = None) -> dict[str, str]:
    """Ambiente do filho: SÓ as variáveis da allowlist + fixos. Nada de segredo passa."""
    fonte = os.environ if origem is None else origem
    mapa = {str(k).upper(): v for k, v in fonte.items()}
    env = {k: mapa[k] for k in _AMBIENTE_PERMITIDO if k in mapa}
    env.update(_AMBIENTE_FIXO)
    return env


def ambiente_gh(origem: dict[str, str] | None = None) -> dict[str, str]:
    """O mesmo de `ambiente_limpo` + sem pager/prompt do gh (autentica pelo keyring, F4)."""
    env = ambiente_limpo(origem)
    env.update(_AMBIENTE_GH)
    return env


# ---------------------------------------------------------------------------
# Comandos: argv montado pelo script, flags por allowlist
# ---------------------------------------------------------------------------

_REF = r"[A-Za-z0-9][A-Za-z0-9._/~^-]{0,120}"
_REF_RE = re.compile(rf"^{_REF}$")
_REV_RE = re.compile(rf"^{_REF}(?:\.\.\.?{_REF})?$")
_NUMERO_PR_RE = re.compile(r"^[1-9][0-9]{0,6}$")
_DATA_RE = re.compile(r"^[A-Za-z0-9 :.+-]{1,40}$")
_ARQUIVO_TESTE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*[.]test[.]ts$")
_REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
# Metacaracteres de shell: irrelevantes com shell=False, mas recusados em campos
# de caminho/ref/nome (em padrões de busca e textos eles são dado legítimo).
_META = frozenset("\"'|&;<>$`(){}^%!")

GH_CAMPOS_VIEW = (
    "number,title,state,headRefOid,baseRefName,headRefName,isDraft,url,author,"
    "additions,deletions,mergeable,files,body"
)
GH_CAMPOS_CHECKS = "name,state,bucket,workflow,link,startedAt,completedAt"
FORMATOS_LOG = {"oneline": "--oneline", "stat": "--stat", "name-only": "--name-only", "name-status": "--name-status"}
FORMATOS_SHOW = {"stat": "--stat", "name-only": "--name-only", "patch": "--patch"}
FORMATOS_DIFF = {"stat": "--stat", "name-only": "--name-only", "name-status": "--name-status", "check": "--check"}
# `npm_check` saiu da lista fechada neste bloco (B9: `npm run check` precisa de `prisma generate`,
# que exige DATABASE_URL — proibido no ambiente das verificações). Pendência P-AGENTE-CHECK-SEM-GENERATE.
VERIFICACOES = ("diff_check", "espelho_codex", "teste")
# Verificações que EXECUTAM código do commit alvo (achado A1 da revisão do PR #417): o script
# `scripts/sync-agent-agents.mjs` e os `tests/*.test.ts` são do commit revisado. Esse código roda
# como o usuário do Windows: o ambiente limpo não o impede de ler `HKCU\Environment` (onde mora a
# chave), de usar o keyring do `gh` nem de escrever fora do worktree. Por isso elas ficam DESLIGADAS
# por padrão e só rodam com a flag explícita `--permitir-execucao-do-alvo`. `diff_check` é só git.
EXECUTAM_CODIGO_DO_ALVO = ("espelho_codex", "teste")
MOTIVO_EXECUCAO_NAO_PERMITIDA = (
    "não permitido nesta execução: esta verificação executa código do commit alvo "
    "(só roda com --permitir-execucao-do-alvo, para SHA de autoria confiável)"
)


@dataclass
class ContextoComandos:
    """O que o script (não o modelo) sabe: raiz, executáveis absolutos, repo do origin."""

    raiz: Raiz
    executaveis: dict[str, str] = field(default_factory=dict)
    repo_gh: str | None = None
    npm_ci: bool = False
    permitir_execucao_alvo: bool = False  # A1: desligado por padrão; só a CLI liga, com flag explícita


def _exe(ctx: ContextoComandos, nome: str) -> str:
    caminho = ctx.executaveis.get(nome)
    if not caminho or not os.path.isabs(caminho):
        raise CercaNegada(f"executável {nome} indisponível")
    return caminho


def _conferir_campos(campos: object, permitidos: tuple[str, ...]) -> dict:
    if not isinstance(campos, dict):
        raise CercaNegada("entrada não é objeto")
    extras = sorted(set(campos) - set(permitidos))
    if extras:
        raise CercaNegada("campo desconhecido: " + ", ".join(str(e)[:40] for e in extras))
    return campos


def _texto(nome: str, valor: object, maximo: int = MAX_CHARS_CAMPO, obrigatorio: bool = True) -> str | None:
    if valor is None:
        if obrigatorio:
            raise CercaNegada(f"{nome} ausente")
        return None
    if not isinstance(valor, str):
        raise CercaNegada(f"{nome} não é texto")
    if valor == "":
        if obrigatorio:
            raise CercaNegada(f"{nome} vazio")
        return None
    if _tem_controle(valor):
        raise CercaNegada(f"{nome} com caractere de controle")
    if len(valor) > maximo:
        raise CercaNegada(f"{nome} longo demais")
    return valor


def _sem_meta(nome: str, valor: str) -> str:
    if any(c in _META for c in valor):
        raise CercaNegada(f"{nome} com metacaractere")
    return valor


def _booleano(nome: str, valor: object) -> bool:
    if valor is None:
        return False
    if not isinstance(valor, bool):
        raise CercaNegada(f"{nome} não é booleano")
    return valor


def _inteiro(nome: str, valor: object, minimo: int, maximo: int, padrao: int | None) -> int | None:
    if valor is None:
        return padrao
    if isinstance(valor, bool) or not isinstance(valor, int):
        raise CercaNegada(f"{nome} não é inteiro")
    if not minimo <= valor <= maximo:
        raise CercaNegada(f"{nome} fora de {minimo}..{maximo}")
    return valor


def _enum(nome: str, valor: object, opcoes: dict[str, str]) -> str | None:
    if valor is None:
        return None
    if not isinstance(valor, str) or valor not in opcoes:
        raise CercaNegada(f"{nome} fora da lista")
    return opcoes[valor]


def _rev(nome: str, valor: object, faixa: bool) -> str | None:
    texto = _texto(nome, valor, maximo=260, obrigatorio=False)
    if texto is None:
        return None
    padrao = _REV_RE if faixa else _REF_RE
    if not padrao.fullmatch(texto):
        raise CercaNegada(f"{nome} inválida")
    return texto


def _caminhos(ctx: ContextoComandos, valor: object, maximo: int = 10) -> list[str]:
    if valor is None:
        return []
    if not isinstance(valor, list):
        raise CercaNegada("caminhos não é lista")
    if len(valor) > maximo:
        raise CercaNegada(f"mais de {maximo} caminhos")
    saida = []
    for item in valor:
        texto = _texto("caminho", item, maximo=MAX_CHARS_CAMINHO)
        _sem_meta("caminho", texto)
        saida.append(ctx.raiz.relativo(ctx.raiz.resolver(texto)))
    return saida


def _numero_pr(valor: object) -> str:
    if isinstance(valor, bool):
        raise CercaNegada("número de PR inválido")
    texto = str(valor) if isinstance(valor, int) else valor
    if not isinstance(texto, str) or not _NUMERO_PR_RE.fullmatch(texto):
        raise CercaNegada("número de PR inválido")
    return texto


def _repo(ctx: ContextoComandos) -> str:
    if not ctx.repo_gh or not _REPO_RE.fullmatch(ctx.repo_gh):
        raise CercaNegada("repositório GitHub do origin não identificado")
    return ctx.repo_gh


def _caminho_em_arvore(texto: str) -> str:
    """Caminho dentro de um objeto git (`<rev>:<caminho>`): não há disco para resolver."""
    _sem_meta("caminho", texto)
    if texto.startswith(("/", "\\")) or PureWindowsPath(texto).drive:
        raise CercaNegada("caminho absoluto")
    partes = [p for p in re.split(r"[\\/]", texto) if p not in ("", ".")]
    if not partes:
        raise CercaNegada("caminho vazio")
    for parte in partes:
        limpa = parte.rstrip(" .").lower()
        if parte == ".." or limpa == "..":
            raise CercaNegada("'..' em caminho")
        if limpa in COMPONENTES_NEGADOS:
            raise CercaNegada(f"componente protegido ({limpa})")
        if componente_reservado(limpa):
            raise CercaNegada("nome de dispositivo reservado")
    motivo = nome_negado(partes[-1].rstrip(" ."))
    if motivo:
        raise CercaNegada(motivo)
    return "/".join(partes)


# Opções globais do git nos comandos que recebem caminhos. `--literal-pathspecs` (achado A5): sem
# ela, o git expande glob DEPOIS da cerca (`cfg/*.env` passava pelo `resolver` e casava `cfg/.env`
# rastreado); com ela, o git usa exatamente o caminho literal que a cerca validou (medido: git 2.53).
_GIT_GLOBAIS = ("--literal-pathspecs", "--no-pager")


def _argv_buscar(c: dict, ctx: ContextoComandos) -> list[str]:
    _conferir_campos(c, ("padrao", "ignorar_caixa", "palavra_inteira", "fixo", "caminhos"))
    padrao = _texto("padrao", c.get("padrao"))
    caminhos = _caminhos(ctx, c.get("caminhos"))
    argv = [_exe(ctx, "git"), *_GIT_GLOBAIS, "grep", "-n", "-I", "--max-count=200"]
    if _booleano("ignorar_caixa", c.get("ignorar_caixa")):
        argv.append("-i")
    if _booleano("palavra_inteira", c.get("palavra_inteira")):
        argv.append("-w")
    argv.append("-F" if _booleano("fixo", c.get("fixo")) else "-E")
    # O padrão vem SEMPRE depois de -e: um padrão "-O vim" ou "--no-index" é dado (F25).
    argv += ["-e", padrao, "--", *caminhos]
    return argv


def _argv_git_log(c: dict, ctx: ContextoComandos) -> list[str]:
    _conferir_campos(
        c,
        (
            "max_entradas", "formato", "sem_merges", "primeiro_pai", "seguir_renomes", "data_iso",
            "busca_texto", "busca_regex", "desde", "ate", "autor", "rev", "caminhos",
        ),
    )
    n = _inteiro("max_entradas", c.get("max_entradas"), 1, 200, 20)
    argv = [_exe(ctx, "git"), *_GIT_GLOBAIS, "log", "--no-color", "--no-ext-diff", "--no-textconv", "-n", str(n)]
    formato = _enum("formato", c.get("formato"), FORMATOS_LOG)
    if formato:
        argv.append(formato)
    if _booleano("sem_merges", c.get("sem_merges")):
        argv.append("--no-merges")
    if _booleano("primeiro_pai", c.get("primeiro_pai")):
        argv.append("--first-parent")
    if _booleano("seguir_renomes", c.get("seguir_renomes")):
        argv.append("--follow")
    if _booleano("data_iso", c.get("data_iso")):
        argv.append("--date=iso")
    busca_texto = _texto("busca_texto", c.get("busca_texto"), maximo=200, obrigatorio=False)
    busca_regex = _texto("busca_regex", c.get("busca_regex"), maximo=200, obrigatorio=False)
    if busca_texto and busca_regex:
        raise CercaNegada("use busca_texto OU busca_regex")
    if busca_texto:
        argv.append("-S" + busca_texto)  # forma colada: nunca vira flag
    if busca_regex:
        argv.append("-G" + busca_regex)
    for nome, flag in (("desde", "--since="), ("ate", "--until=")):
        valor = _texto(nome, c.get(nome), maximo=40, obrigatorio=False)
        if valor:
            if not _DATA_RE.fullmatch(valor):
                raise CercaNegada(f"{nome} inválida")
            argv.append(flag + valor)
    autor = _texto("autor", c.get("autor"), maximo=200, obrigatorio=False)
    if autor:
        argv.append("--author=" + autor)
    rev = _rev("rev", c.get("rev"), faixa=True)
    caminhos = _caminhos(ctx, c.get("caminhos"))
    if rev:
        argv.append(rev)
    argv += ["--", *caminhos]
    return argv


def _argv_git_show(c: dict, ctx: ContextoComandos) -> list[str]:
    _conferir_campos(c, ("objeto", "formato"))
    objeto = _texto("objeto", c.get("objeto"), maximo=MAX_CHARS_CAMINHO)
    if ":" in objeto:
        rev, caminho = objeto.split(":", 1)
        if not _REF_RE.fullmatch(rev):
            raise CercaNegada("objeto inválido")
        objeto = f"{rev}:{_caminho_em_arvore(caminho)}"
    elif not _REF_RE.fullmatch(objeto):
        raise CercaNegada("objeto inválido")
    argv = [_exe(ctx, "git"), "--no-pager", "show", "--no-color", "--no-ext-diff", "--no-textconv"]
    formato = _enum("formato", c.get("formato"), FORMATOS_SHOW)
    if formato:
        argv.append(formato)
    # `--` depois do objeto (achado A5): força o git a lê-lo como REVISÃO. Sem ele, `git show
    # cfg/.env` (sem `:`) caía no DWIM do git como caminho e devolvia o conteúdo rastreado que a
    # negação por nome barra em `HEAD:cfg/.env`. Medido: `git show cfg/.env --` -> "bad revision".
    argv += [objeto, "--"]
    return argv


def _argv_git_diff(c: dict, ctx: ContextoComandos) -> list[str]:
    _conferir_campos(c, ("formato", "contexto", "renomes", "revs", "caminhos"))
    argv = [_exe(ctx, "git"), *_GIT_GLOBAIS, "diff", "--no-color", "--no-ext-diff", "--no-textconv"]
    formato = _enum("formato", c.get("formato"), FORMATOS_DIFF)
    if formato:
        argv.append(formato)
    contexto = _inteiro("contexto", c.get("contexto"), 0, 50, None)
    if contexto is not None:
        argv.append(f"-U{contexto}")
    if _booleano("renomes", c.get("renomes")):
        argv.append("-M")
    revs_brutos = c.get("revs")
    if revs_brutos is None:
        revs_brutos = []
    if not isinstance(revs_brutos, list) or len(revs_brutos) > 2:
        raise CercaNegada("revs: lista de 0 a 2")
    revs = [_rev("rev", r, faixa=True) for r in revs_brutos]
    if any(r is None for r in revs):
        raise CercaNegada("rev vazia")
    if len(revs) == 2 and any(".." in r for r in revs):
        raise CercaNegada("faixa só com uma rev")
    caminhos = _caminhos(ctx, c.get("caminhos"))
    argv += [*revs, "--", *caminhos]
    return argv


def _argv_git_ls_files(c: dict, ctx: ContextoComandos) -> list[str]:
    _conferir_campos(c, ("caminhos",))
    return [_exe(ctx, "git"), *_GIT_GLOBAIS, "ls-files", "--", *_caminhos(ctx, c.get("caminhos"))]


def _argv_gh_pr_view(c: dict, ctx: ContextoComandos) -> list[str]:
    _conferir_campos(c, ("numero",))
    numero = _numero_pr(c.get("numero"))
    # -R é do script (derivado do origin), nunca do modelo (F17).
    return [_exe(ctx, "gh"), "pr", "view", numero, "-R", _repo(ctx), "--json", GH_CAMPOS_VIEW]


def _argv_gh_pr_diff(c: dict, ctx: ContextoComandos) -> list[str]:
    _conferir_campos(c, ("numero", "so_nomes"))
    numero = _numero_pr(c.get("numero"))
    argv = [_exe(ctx, "gh"), "pr", "diff", numero, "-R", _repo(ctx), "--color", "never"]
    if _booleano("so_nomes", c.get("so_nomes")):
        argv.append("--name-only")
    return argv


def _argv_gh_pr_checks(c: dict, ctx: ContextoComandos) -> list[str]:
    _conferir_campos(c, ("numero",))
    numero = _numero_pr(c.get("numero"))
    return [_exe(ctx, "gh"), "pr", "checks", numero, "-R", _repo(ctx), "--json", GH_CAMPOS_CHECKS]


def _argv_verificar(c: dict, ctx: ContextoComandos) -> list[str]:
    _conferir_campos(c, ("nome", "arquivo"))
    nome = c.get("nome")
    if nome not in VERIFICACOES:
        raise CercaNegada("verificação fora da lista fechada")
    if nome == "diff_check":
        return [_exe(ctx, "git"), "--no-pager", "diff", "--check"]
    # A1: o portão vem ANTES de qualquer outra checagem e de qualquer processo.
    if nome in EXECUTAM_CODIGO_DO_ALVO and ctx.permitir_execucao_alvo is not True:
        raise CercaNegada(MOTIVO_EXECUCAO_NAO_PERMITIDA)
    if nome == "espelho_codex":
        return [_exe(ctx, "node"), "scripts/sync-agent-agents.mjs", "--check"]
    # nome == "teste": precisa do node_modules do `npm ci` próprio do worktree.
    if not ctx.npm_ci:
        raise CercaNegada("não autorizado nesta execução (rode o agente com --npm-ci)")
    # `node.EXE` direto, nunca `npm.CMD test -- <arquivo>`: nenhum campo do modelo chega a um .CMD
    # (BatBadBut, §3.10).
    arquivo = _texto("arquivo", c.get("arquivo"), maximo=120)
    if not _ARQUIVO_TESTE_RE.fullmatch(arquivo):
        raise CercaNegada("arquivo de teste inválido")
    if "-db" in arquivo:
        # Substring, não sufixo: tests/permission-catalog-db-parity.test.ts (F11).
        raise CercaNegada("teste de banco (-db) fora da lista")
    resolvido = ctx.raiz.resolver("tests/" + arquivo)
    if not resolvido.is_file():
        raise CercaNegada("arquivo de teste inexistente")
    return [_exe(ctx, "node"), "--test", "--import", "tsx", "tests/" + arquivo]


_MONTADORES = {
    "buscar": _argv_buscar,
    "git_log": _argv_git_log,
    "git_show": _argv_git_show,
    "git_diff": _argv_git_diff,
    "git_ls_files": _argv_git_ls_files,
    "gh_pr_view": _argv_gh_pr_view,
    "gh_pr_diff": _argv_gh_pr_diff,
    "gh_pr_checks": _argv_gh_pr_checks,
    "verificar": _argv_verificar,
}


def validar_argv(ferramenta: str, campos: object, ctx: ContextoComandos) -> list[str]:
    """Argv final para a ferramenta, ou `CercaNegada`. Catálogo por dict explícito."""
    montador = _MONTADORES.get(ferramenta)
    if montador is None:
        raise CercaNegada("ferramenta sem comando")
    return montador(campos, ctx)
