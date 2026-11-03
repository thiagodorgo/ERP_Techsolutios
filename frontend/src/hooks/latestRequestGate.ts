/**
 * Guarda de "só a leitura mais nova vale" para hooks que recarregam em mais de um lugar (ação do usuário +
 * auto-refresh em segundo plano). Sem ela, uma resposta antiga que chega DEPOIS de uma nova sobrescreve a tela
 * com o estado de antes da gravação (demo 02/11: requisito gravado aparecia desmarcado; encargo registrado não
 * aparecia na Guia de débitos).
 *
 * Uso: `const ticket = gate.begin()` antes do `await`; depois do `await`, só aplica se `gate.isLatest(ticket)`.
 * `gate.invalidate()` descarta toda leitura em voo (ex.: quando a resposta de uma gravação já foi aplicada).
 */
export type LatestRequestGate = {
  readonly begin: () => number;
  readonly isLatest: (ticket: number) => boolean;
  readonly invalidate: () => void;
};

export function createLatestRequestGate(): LatestRequestGate {
  let current = 0;
  return {
    begin: () => {
      current += 1;
      return current;
    },
    isLatest: (ticket: number) => ticket === current,
    invalidate: () => {
      current += 1;
    },
  };
}
