# Cota — landing independente

Esta pasta é o site da landing. Ela não entra no deploy do app.

Publique só `landing/`. O Next em `apps/web` continua sendo o produto.

## Arquivos

| Arquivo | Para quê |
| --- | --- |
| `index.html` | A página. |
| `icon.svg` | Ícone do app, copiado para cá. Favicon, cabeçalho, proposta e lista. |
| `apple-touch-icon.png` | Ícone do app para a tela inicial do celular. |
| `config.js` | Endereço do app. Entrar e Criar conta apontam para lá. |
| `main.js` | Liga os botões e a rolagem da cena. |
| `crane-scene.js` | A cena 3D. O three.js vem da CDN, não do app. |
| `reference/landing-design.html` | Referência visual. Não é a página publicada. |

## Antes de publicar

Em `config.js`, troque o endereço do app:

```js
window.COTA_APP_URL = "https://seu-app.exemplo";
```

Abra `index.html` no navegador, ou sirva a pasta:

```bash
cd landing
python3 -m http.server 4173
```

Entrar vai para `{COTA_APP_URL}/sign-in`. Criar conta vai para `{COTA_APP_URL}/sign-up`.
