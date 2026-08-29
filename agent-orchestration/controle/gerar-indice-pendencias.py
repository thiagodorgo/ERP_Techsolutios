#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#
# Gera `pendencias-indice.md` a partir de `pendencias.md`.
#
# POR QUE EXISTE: o pendencias.md passou de 228 cabecalhos e 3.500 linhas e perdeu o proprio indice
# (97 entradas sem status, 131 sem severidade, 9 com dono). O indice responde "o que esta aberto,
# com que gravidade e de quem e" — e e GERADO, nunca digitado.
#
# HISTORIA DESTE CLASSIFICADOR — leia antes de mexer. A primeira versao decidia "fechada" por
# substring no cabecalho, e a junta do SAN2-1 a REPROVOU, com razao. Ela confundia DUAS coisas
# distintas, e as duas foram reproduzidas em bancada:
#
#   1. VOCABULARIO DE DOMINIO com vocabulario de STATUS.
#      "Compensacao retroativa a periodo FECHADO" casava a busca por FECHAD — mas "fechado" ali
#      qualifica o PERIODO CONTABIL, nao a pendencia. Uma palavra do negocio virava um veredito
#      de estado.
#
#   2. RESOLUCAO PARCIAL com resolucao.
#      "RESOLVIDO PARCIAL" casava RESOLVID e o qualificador era ignorado. Aquela entrada lista
#      QUATRO residuais abertos que nao tem cabecalho proprio — fecha-la sumia com eles da
#      resposta a "o que esta aberto?". Era a mesma classe do P-O6R-B04.
#
# REGRAS DESTA VERSAO, e o motivo de cada uma:
#   * So conta status em CONTEXTO DE STATUS: linha que comeca por "status:" ou "Estado:".
#     Texto corrido nao decide estado.
#   * Qualificador de parcialidade (PARCIAL/PARCIALMENTE/RESIDUAL) NUNCA fecha: resolucao pela
#     metade deixa metade aberta.
#   * A LINHA de status vence o CABECALHO — a linha e o campo canonico.
#   * Contradicao NAO vira palpite: emite CONTRADITORIA. Decidir qual vence exige a DATA de cada
#     afirmacao, que um regex nao tem; chutar aqui foi exatamente o defeito anterior.
#   * Severidade material SINALIZA o balde C: item CRITICA/ALTA/MEDIA marcado como diferido
#     aparece sinalizado, para o dono ver que ha peso material sendo adiado.
#
# Uso:  python agent-orchestration/controle/gerar-indice-pendencias.py

import io
import re
import collections

P = 'agent-orchestration/controle/pendencias.md'
O = 'agent-orchestration/controle/pendencias-indice.md'

PARCIAL = re.compile(r'\bPARCIAL|\bPARCIALMENTE|\bRESIDUA', re.I)
LINHA = re.compile(
    r'^[-*>]?\s*\**(?:status|estado)\**\s*:?\s*\**\s*'
    r'(FECHAD\w*|RESOLVID\w*|DESCARTAD\w*|DECIDID\w*|ABERT\w*)', re.M | re.I)
CABEC = re.compile(r'\*\*(?:FECHAD[AO]|RESOLVID[AO]S?|DESCARTAD[AO]|SUPERAD[AO])\b', re.I)
FECHA = re.compile(r'^(FECHAD|RESOLVID|DESCARTAD|DECIDID)', re.I)
# Marcador ATIVO de agendamento: exige o campo, e recusa a forma riscada (~~DIFERIDO-LEVE~~),
# que e como uma retirada do balde C se registra sem apagar o historico.
AGENDA = re.compile(r'\*\*agendamento:?\*\*\s*:?\s*DIFERIDO-LEVE', re.I)

MATERIAIS = ('CRÍTICA', 'ALTA', 'MÉDIA')


def classificar(head, body):
    """Devolve 'FECHADA', 'ABERTA', 'CONTRADITORIA' ou 'SEM-STATUS'.

    SO A LINHA DE STATUS DECIDE. O cabecalho NUNCA fecha nada — foi tentar deduzir estado do
    cabecalho que produziu os dois defeitos que a junta reprovou ("periodo fechado" virou
    pendencia fechada; "RESOLVIDO PARCIAL" fechou uma entrada com quatro residuais abertos).
    O cabecalho entra so para DENUNCIAR contradicao, nunca para resolve-la — e a ausencia de
    linha de status vira SEM-STATUS, um estado visivel, em vez de um palpite silencioso.
    """
    m = LINHA.search(body)
    cab_fecha = bool(CABEC.search(head)) and not PARCIAL.search(head)
    if not m:
        return 'SEM-STATUS'
    if FECHA.match(m.group(1)) and not PARCIAL.search(m.group(0)):
        return 'FECHADA'
    return 'CONTRADITORIA' if cab_fecha else 'ABERTA'


def severidade(body):
    for k, v in (('CRÍTICA', 'CRÍTICA'), ('ALTA', 'ALTA'),
                 ('MÉDIA', 'MÉDIA'), ('MEDIA', 'MÉDIA'), ('BAIXA', 'BAIXA')):
        if re.search(r'\b' + k + r'\b', body, re.I):
            return v
    return ''


lines = io.open(P, encoding='utf-8').read().split('\n')
idx = [i for i, l in enumerate(lines) if l.startswith('## ')] + [len(lines)]
rows = []
for a, b in zip(idx, idx[1:]):
    m = re.match(r'## (P-[A-Za-z0-9ΩΔ_-]+)', lines[a])
    if not m:
        continue
    pid, body, head = m.group(1), '\n'.join(lines[a:b]), lines[a][3:].strip()
    est = classificar(head, body)
    # DIFERIDO por MARCADOR ATIVO, nao por presenca de substring. A primeira versao usava
    # `'DIFERIDO-LEVE' in body`, e isso remarcava como diferida uma entrada cujo unico
    # "DIFERIDO-LEVE" era o texto RISCADO da propria retirada do balde (~~DIFERIDO-LEVE~~).
    # Achado A-6 da junta: regra por substring le mencao como se fosse declaracao.
    dif = bool(AGENDA.search(body))
    sev = severidade(body)
    dono = bool(re.search(r'\*\*dono:\*\*\s*(?!a atribuir)', body, re.I)) or bool(re.search(r'\*\*Dono:?\*\*', body))
    if est == 'FECHADA':
        balde = '-'
    elif est == 'SEM-STATUS':
        balde = '?'
    elif dif:
        balde = 'C'
    elif sev in MATERIAIS:
        balde = 'A'
    else:
        balde = 'B'
    rows.append(dict(id=pid, linha=a + 1, est=est, sev=sev, dono=dono, balde=balde,
                     head=head, suspeito=(dif and sev in MATERIAIS)))

cnt = collections.Counter(r['est'] for r in rows)
bal = collections.Counter(r['balde'] for r in rows)
ids = collections.Counter(r['id'] for r in rows)
repetidos = {k: v for k, v in ids.items() if v > 1}
suspeitos = [r for r in rows if r['suspeito']]
sem_status = [r for r in rows if not LINHA.search('\n'.join(lines[r['linha'] - 1:]))]

o = io.open(O, 'w', encoding='utf-8', newline='')
o.write(u"""# Indice de pendencias — GERADO, nao digitado

> Produzido por `agent-orchestration/controle/gerar-indice-pendencias.py`.
> **Se este arquivo divergir do `pendencias.md`, vale o `pendencias.md`** e o indice se regenera.

> **Este classificador ja foi REPROVADO por uma junta, e o que ele aprendeu esta escrito no
> cabecalho do script.** A primeira versao decidia "fechada" por substring no cabecalho, e isso
> confundia **vocabulario de dominio com vocabulario de status** (*"periodo **fechado**"* fechou
> uma pendencia) e **resolucao parcial com resolucao** (*"RESOLVIDO **PARCIAL**"* fechou uma
> entrada que lista quatro residuais abertos). Ambas eram a classe que esta rodada existe para
> exterminar, cometidas pelo bloco que existia para extermina-la.

## As regras, ditas por inteiro

1. **So conta status em contexto de status** — linha que comeca por `status:` ou `Estado:`.
   Texto corrido nao decide estado.
2. **Qualificador de parcialidade nunca fecha** (PARCIAL / PARCIALMENTE / RESIDUAL).
3. **A linha de status vence o cabecalho** — a linha e o campo canonico.
4. **Contradicao nao vira palpite.** Quando linha e cabecalho se opoem, o indice emite
   **`CONTRADITORIA`**. Decidir qual vence exige a **data** de cada afirmacao, que um regex nao
   tem — e chutar aqui foi exatamente o defeito anterior.
5. **Severidade material sinaliza o balde C.** Item CRITICA/ALTA/MEDIA marcado como diferido
   aparece **sinalizado**, para o dono ver que ha peso material sendo adiado.
6. **`DIFERIDO-LEVE` e agendamento, nao status** — diferida **continua ABERTA**.

## Placar

| | qtde |
|---|---:|
| Cabecalhos `## P-` | **%d** |
| IDs distintos | %d |
| **ABERTAS** | **%d** |
| — das quais **diferidas** (balde C) | %d |
| — das quais **ativas nesta rodada** | **%d** |
| **CONTRADITORIAS** (exigem decisao) | **%d** |
| FECHADAS | %d |

> O placar conta **cabecalhos**, nao pendencias distintas: **%d cabecalhos para %d IDs**, porque
> **%d IDs aparecem mais de uma vez** (emendas apensadas, §A2). Quem citar "N pendencias abertas"
> deve dizer qual das duas reguas esta usando.
""" % (len(rows), len(ids), cnt['ABERTA'], bal['C'], cnt['ABERTA'] - bal['C'],
       cnt['CONTRADITORIA'], cnt['FECHADA'], len(rows), len(ids), len(repetidos)))

if suspeitos:
    o.write(u"\n## Diferidas com severidade MATERIAL — %d (o dono deve olhar)\n\n"
            u"| ID | linha | severidade | titulo |\n|---|--:|---|---|\n" % len(suspeitos))
    for r in sorted(suspeitos, key=lambda x: x['linha']):
        o.write(u"| `%s` | %d | **%s** | %s |\n" % (r['id'], r['linha'], r['sev'], r['head'][:80].replace('|', '/')))

for titulo, f in (
        (u"SEM STATUS — nenhuma linha `status:`/`Estado:` (o indice NAO chuta)", lambda r: r['est'] == 'SEM-STATUS'),
        (u"CONTRADITORIAS — cabecalho e linha de status se opoem", lambda r: r['est'] == 'CONTRADITORIA'),
        (u"ABERTAS · balde A — material", lambda r: r['est'] == 'ABERTA' and r['balde'] == 'A'),
        (u"ABERTAS · balde B — processo/registro", lambda r: r['est'] == 'ABERTA' and r['balde'] == 'B'),
        (u"ABERTAS · balde C — DIFERIDO-LEVE (lista nominal, vetavel)", lambda r: r['balde'] == 'C'),
        (u"FECHADAS", lambda r: r['est'] == 'FECHADA')):
    sel = [r for r in rows if f(r)]
    o.write(u"\n## %s — %d\n\n| ID | linha | severidade | dono | titulo |\n|---|--:|---|---|---|\n" % (titulo, len(sel)))
    for r in sorted(sel, key=lambda x: x['linha']):
        o.write(u"| `%s` | %d | %s | %s | %s |\n" % (
            r['id'], r['linha'], r['sev'] or u'—',
            u'sim' if r['dono'] else u'**a atribuir**', r['head'][:88].replace('|', '/')))
o.close()
print("indice: %d cabecalhos / %d IDs | %s | baldes %s | diferidas-materiais %d"
      % (len(rows), len(ids), dict(cnt), dict(bal), len(suspeitos)))
