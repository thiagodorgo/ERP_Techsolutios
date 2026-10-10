// Grupo A: formas compatíveis numa injeção só (cada uma segue com a sua asserção).
import * as f15 from "./inject.mts";
import * as f6 from "./inject-prefixo.mts";
import * as novas from "./inject-novas.mts";
import * as tipo from "./inject-tipo.mts";
import * as motivo from "./inject-motivo.mts";
export async function inject(app: any) {
  await f15.inject(app); await f6.inject(app); await novas.inject(app); await tipo.inject(app); await motivo.inject(app);
}
