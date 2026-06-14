# Assets de Imagens

## Localizacao

As imagens de veiculos do aplicativo Flutter ficam em:

```text
mobile/flutter_app/assets/images
```

No checkout atual, o caminho completo e:

```text
C:\Users\AMP\Documents\GitHub\ERP_Techsolutios\mobile\flutter_app\assets\images
```

Dentro do app Flutter, os caminhos devem ser referenciados a partir da raiz do pacote:

```text
assets/images/<veiculo>/<arquivo>.png
```

## Estrutura final esperada

```text
mobile/flutter_app/assets/images/
  bus/
    bus-left.png
    bus-right.png
    bus-front.png
    bus-back.png

  motorcycle/
    motorcycle-left.png
    motorcycle-right.png
    motorcycle-front.png
    motorcycle-back.png

  pickup/
    pickup-left.png
    pickup-right.png
    pickup-front.png
    pickup-back.png

  sedan/
    sedan-left.png
    sedan-right.png
    sedan-front.png
    sedan-back.png

  truck/
    truck-left.png
    truck-right.png
    truck-front.png
    truck-back.png

  van/
    van-left.png
    van-right.png
    van-front.png
    van-back.png
```

## Tabela de arquivos

| Veiculo | Vista esquerda | Vista direita | Vista frontal | Vista traseira |
|---|---|---|---|---|
| Bus | `assets/images/bus/bus-left.png` | `assets/images/bus/bus-right.png` | `assets/images/bus/bus-front.png` | `assets/images/bus/bus-back.png` |
| Motorcycle | `assets/images/motorcycle/motorcycle-left.png` | `assets/images/motorcycle/motorcycle-right.png` | `assets/images/motorcycle/motorcycle-front.png` | `assets/images/motorcycle/motorcycle-back.png` |
| Pickup | `assets/images/pickup/pickup-left.png` | `assets/images/pickup/pickup-right.png` | `assets/images/pickup/pickup-front.png` | `assets/images/pickup/pickup-back.png` |
| Sedan | `assets/images/sedan/sedan-left.png` | `assets/images/sedan/sedan-right.png` | `assets/images/sedan/sedan-front.png` | `assets/images/sedan/sedan-back.png` |
| Truck | `assets/images/truck/truck-left.png` | `assets/images/truck/truck-right.png` | `assets/images/truck/truck-front.png` | `assets/images/truck/truck-back.png` |
| Van | `assets/images/van/van-left.png` | `assets/images/van/van-right.png` | `assets/images/van/van-front.png` | `assets/images/van/van-back.png` |

## Convencao de vistas

| Nome | Significado |
|---|---|
| `left` | vista lateral esquerda |
| `right` | vista lateral direita |
| `front` | vista frontal |
| `back` | vista traseira |

## Exemplo de uso no Flutter

```dart
Image.asset(
  'assets/images/truck/truck-front.png',
  fit: BoxFit.contain,
)
```

Tambem e valido usar `AssetImage` quando a API do widget exigir um `ImageProvider`:

```dart
const AssetImage('assets/images/van/van-right.png')
```

## Exemplo de configuracao no pubspec.yaml

Preferir o registro por pasta para evitar manutencao manual a cada troca de arquivo:

```yaml
flutter:
  assets:
    - assets/images/bus/
    - assets/images/motorcycle/
    - assets/images/pickup/
    - assets/images/sedan/
    - assets/images/truck/
    - assets/images/van/
```

Se o projeto usar entradas individuais no `pubspec.yaml`, os nomes devem seguir a nomenclatura correta (`right` e `back`).

## Regras de organizacao

- A nomenclatura antiga `rigth` foi corrigida para `right`.
- A nomenclatura antiga `beck` foi corrigida para `back`.
- Manter imagens gerais em `assets/images`.
- Manter logos e elementos de marca em `assets/brand`, se essa pasta existir.
- Nao usar a pasta `build` para guardar assets; ela e saida gerada pelo processo de build e pode ser apagada.
