import '../domain/prestador_models.dart';

/// Semente do app de demonstração local (modo sem servidor). Nunca é usada no
/// modo remoto: lá a lista vem de `GET /mobile/technician/stock` e um erro
/// mostra o estado de erro — nunca este catálogo inventado.
const demoTechnicianStock = <TechnicianStockItem>[
  TechnicianStockItem(
    sku: 'ELE-0102',
    name: 'Disjuntor tripolar 25A',
    category: 'Protecao',
    available: 6,
    unit: 'un',
  ),
  TechnicianStockItem(
    sku: 'ELE-0210',
    name: 'Contatora 18A 220V',
    category: 'Comando',
    available: 3,
    unit: 'un',
  ),
  TechnicianStockItem(
    sku: 'ELE-0215',
    name: 'Rele termico 12-18A',
    category: 'Comando',
    available: 2,
    unit: 'un',
  ),
  TechnicianStockItem(
    sku: 'ELE-0044',
    name: 'Cabo flexivel 2,5mm2',
    category: 'Cabos',
    available: 30,
    unit: 'm',
  ),
  TechnicianStockItem(
    sku: 'ELE-0031',
    name: 'Fusivel 20A',
    category: 'Protecao',
    available: 24,
    unit: 'un',
  ),
  TechnicianStockItem(
    sku: 'CON-0009',
    name: 'Fita isolante 19mm',
    category: 'Consumivel',
    available: 8,
    unit: 'rolo',
  ),
  TechnicianStockItem(
    sku: 'CON-0021',
    name: 'Conector WAGO 3 vias',
    category: 'Conexao',
    available: 40,
    unit: 'un',
  ),
  TechnicianStockItem(
    sku: 'FIX-0012',
    name: 'Abracadeira nylon 200mm',
    category: 'Fixacao',
    available: 60,
    unit: 'un',
  ),
];

const demoTechnicianStockCustody = TechnicianStockCustody(
  kind: 'professional',
  label: 'Tecnico de Campo',
);
