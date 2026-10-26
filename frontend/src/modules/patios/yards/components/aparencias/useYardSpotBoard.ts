import { useCallback, useEffect, useState } from "react";

import { getVehicleLabel } from "../../../processes/processes.adapter";
import { listProcessesByYard } from "../../../processes/processes.service";
import { getYardOccupancy, listYardAreas } from "../../yards.service";
import type { YardAreaItem, YardsApiContext, YardSpotItem } from "../../yards.types";

// B-APARENCIA-USUARIO — vagas de UM pátio para as aparências B (mapa resumido no detalhe da linha) e C (quadro ao
// lado da lista). São as MESMAS chamadas da página do pátio (PatioDetailPage: áreas + ocupação + processos para a
// placa), feitas só quando a linha abre (B) ou o pátio é escolhido (C) — nunca na lista.
// §allowlist: o id do processo só serve ao link do dossiê; a placa vem da lista de processos.

export type YardSpotBoardState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | {
      readonly status: "success";
      readonly areas: readonly YardAreaItem[];
      readonly spots: readonly YardSpotItem[];
      readonly plateByProcess: ReadonlyMap<string, string>;
    }
  | { readonly status: "error"; readonly message: string };

export function useYardSpotBoard(context: YardsApiContext, yardId: string | null) {
  const [state, setState] = useState<YardSpotBoardState>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!yardId) {
      setState({ status: "idle" });
      return undefined;
    }
    let active = true; // stale-guard: trocar de pátio rápido não deixa a resposta antiga vencer.
    setState({ status: "loading" });
    void Promise.all([listYardAreas(context, yardId), getYardOccupancy(context, yardId), listProcessesByYard(context, yardId)])
      .then(([areas, occupancy, processes]) => {
        if (!active) return;
        setState({
          status: "success",
          areas: [...areas].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
          spots: occupancy.items,
          plateByProcess: new Map(processes.map((process) => [process.id, getVehicleLabel(process)])),
        });
      })
      .catch(() => {
        if (active) setState({ status: "error", message: "Não foi possível carregar as vagas deste pátio." });
      });
    return () => {
      active = false;
    };
  }, [context, yardId, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { state, retry };
}
