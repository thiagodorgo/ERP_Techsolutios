# Prompt — B-O6R-02 Unidade de trabalho financeira

Corrija Ω6R-DIN-001, Ω6R-DIN-002, Ω6R-DIN-003, Ω6R-DIN-004, Ω6R-DIN-008 e Ω6R-QUA-003 nos módulos financial-entries/titles/cheques/period-close. Introduza UoW tenant-scoped que compartilhe `TransactionClient`, sem remover FORCE RLS.

Done-when: pagamento+entry+title são atômicos/idempotentes; estorno único restaura título; cheque state+entry+link é atômico; `paid_amount<=amount` tem guard/constraint; título movido não é apagado; writers e close usam o mesmo advisory lock. Testes PostgreSQL com duas conexões, barreira e falha em cada fronteira; exatamente um lançamento/estorno e snapshot consistente. Nenhum teste Memory substitui o gate DB.
