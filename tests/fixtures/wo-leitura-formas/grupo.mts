// B-WO-LEITURA — as 4 formas numa injeção só (o idioma do `grupo-a.mts` do 07c: cada uma segue com a sua asserção no
// guard). Os caminhos não colidem: `/work-orders/:workOrderId/leitura-nova`, `/tags-eco/:workOrderId`, `/eco-lista` e a
// camada `/via-use/:workOrderId`.
import * as getNova from "./inject-get-nova.mts";
import * as referencia from "./inject-referencia-vaza.mts";
import * as query from "./inject-query-vaza.mts";
import * as viaUse from "./inject-via-use.mts";
export async function inject(app: any) {
  await getNova.inject(app); await referencia.inject(app); await query.inject(app); await viaUse.inject(app);
}
