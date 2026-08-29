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
