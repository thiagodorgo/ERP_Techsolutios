# Perda de jurado — cadeira de TRILHA e APPEND-ONLY (2026-08-29)

Registro do orquestrador, feito **no momento da perda**, para a ata consignar.

**O que houve.** O titular da cadeira de trilha/append-only (com veto) **caiu por erro de infraestrutura**
(`API Error: Connection lost mid-response`) **antes de emitir o voto**. Ele havia avançado no mandato e chegou
a produzir um resultado parcial sobre a integridade dos registros reconciliados.

**O que foi feito, conforme a R2 do inspetor de terreno.** O voto perdido **não conta**. Foi disparado um
**suplente com identidade nova**, que **re-executa o mandato inteiro, do zero**. O resultado parcial do titular
foi **explicitamente marcado como não-insumo** no briefing do suplente: *"esse resultado NÃO é insumo seu e não
deve ser tratado como fato"*. Nada do que o titular começou conta.

**Por que isso importa e não é formalidade.** O parcial do titular era uma afirmação **a favor** da entrega. Se
fosse herdado, o suplente entraria já convencido do ponto que lhe cabe atacar — a mesma classe que a
`D-JUNTA-SEPARACAO-DE-PAPEIS` descreve, e a mesma que fez a junta do ciclo 4 do `B-O6R-02` herdar da ata
anterior uma premissa falsa como fato (achado que motivou a criação do próprio inspetor de terreno,
`D-INSPETOR-TERRENO-JUNTA`). Um resultado que ninguém terminou de verificar não é evidência; é uma frase.

**Consequência para o quórum.** A junta **não fecha com menos de 3 votos**. Dois votos não são maioria de três
— são junta inválida. Se o suplente também cair, dispara-se outro suplente, e a ata registra cada perda.

---

## Segunda perda — cadeira de KPI e NÚMEROS (2026-08-29)

**O que houve.** O titular da cadeira de KPI/números **também caiu por erro de infraestrutura**
(`API Error: Connection lost mid-response`), desta vez **no início do mandato** — não mediu nada e **não deixou
insumo algum**. Suplente com identidade nova disparado, executando o mandato do zero.

**Padrão observado nesta junta, para a ata.** Duas das três cadeiras caíram por infraestrutura antes de votar.
Não é a primeira vez: a junta do ciclo 4 do `B-O6R-02` perdeu **quatro** cadeiras por limite de sessão em 26/08
e teve de ser refeita com suplentes em 28/08. **Isto é uma classe, não azar.** O mandato dos suplentes desta
junta passou a trazer instrução explícita de **economia de passos** e de **emitir voto parcial e honesto**
declarando o que não foi medido, em vez de morrer com a medição pela metade — porque um voto que declara seus
próprios limites é auditável, e um jurado morto não é.

**Nomeado para o orquestrador, sem correção aqui:** vale uma pendência sobre o custo de mandatos longos em
junta (o do titular de KPI tinha 6 itens; o de trilha, 6 itens com duas verificações de veto). Fatiar cadeira
grande em duas menores é mais barato que perder e refazer.
