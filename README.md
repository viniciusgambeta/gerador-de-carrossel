# Carrossel

Cole o link de uma notícia e receba um carrossel 1080×1350 pronto para o Instagram: escrito, ilustrado, editável e exportável em PNG.

## Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Na primeira vez, clique na engrenagem e cole as chaves:

| Chave | Para quê | Obrigatória |
|---|---|---|
| OpenAI | Escreve os slides e a legenda | Sim |
| Unsplash (Access Key) | Fotos profissionais para cenas e conceitos | Não (sem ela, Wikipédia + Wikimedia Commons) |
| Pixabay | Mais fotos de banco e objetos sem fundo (PNG) que entram em alguns slides | Não (sem ela, sem objetos) |
| JEV (TypeSafe) | Decisões rápidas: valida o scraping, detecta notícia sensível, escolhe fotos (ou descarta todas) e o próximo formato | Não (sem ela, regras simples) |
| [Postproxy](https://postproxy.dev) | Publica ou agenda o carrossel no Instagram conectado na sua conta Postproxy | Não (sem ela, baixe os PNGs e publique à mão) |

As chaves ficam só no navegador (`localStorage`) e passam pelas rotas locais da API.

### Imagens

Cada slide com foto traz três pistas escritas pela IA: o **nome próprio** (pessoa, lugar, empresa), a **cena** específica e um **conceito amplo**. A busca tenta nessa ordem e para no primeiro resultado relevante:

1. Nome próprio → foto principal do artigo da Wikipédia (en/pt) → Commons.
2. Cena → Unsplash → Pixabay → Commons (precisa compartilhar as palavras da cena; fotos de "fulano no evento X" são descartadas).
3. Conceito amplo → Unsplash → Pixabay → foto principal do artigo da Wikipédia sobre o conceito.
4. Último recurso: uma foto genérica da editoria (economia → dinheiro, saúde → hospital…).

Se mesmo assim nada servir, um slide de foto vira frase de impacto em vez de mostrar uma imagem sem relação.

Com a chave do Pixabay, a IA também pode pedir um **objeto sem fundo** (PNG transparente) para 2 ou 3 slides sem foto; ele entra no espaço livre ao lado do texto (passe o mouse sobre ele no editor para removê-lo). As imagens do Pixabay ficam guardadas em `.cache/images`, porque os links delas expiram em 24 horas.

O Wikimedia limita clientes anônimos. Para limites melhores, crie `.env.local` com um contato seu (e-mail ou site), conforme a [política de User-Agent](https://meta.wikimedia.org/wiki/User-Agent_policy):

```
WIKIMEDIA_CONTACT=seu-email@exemplo.com
```

Quer ver todos os formatos sem gastar créditos? Abra `http://localhost:3000/?demo`.

## Como usar

- **Colar o link já inicia** a geração. A IA primeiro escreve a notícia como uma narrativa contínua (um trecho por slide) e só depois monta os slides a partir dela, para que cada slide continue o anterior. Os slides aparecem enquanto são escritos.
- **Duplo clique** em qualquer texto edita no lugar (Enter confirma, Esc cancela, Ctrl+B destaca).
- **Clique** num bloco para selecioná-lo: as alças das laterais mudam a largura (o texto quebra de novo), as de cima/baixo a altura (o texto diminui para caber) e os cantos as duas. Na barra: A−/A+ (ou as teclas + e −), tamanho automático, voltar ao original e remover do slide (ou Delete). Setas movem; Shift+setas, mais rápido.
- **Arraste** blocos e imagens: eles grudam nas margens, no centro do slide e nas bordas e centros dos outros elementos, e uma linha rosa mostra o alinhamento. Segure **Alt** para mover livre.
- **Seus ajustes viram padrão**: posição, tamanho e fonte que você muda num formato (capa, citação, lista…) são lembrados por estilo, e os próximos carrosséis já começam assim. Dá para desligar ou esquecer em **Configurações → Visual**.
- **Inserir imagem** (barra do slide) coloca uma foto ou um objeto sem fundo (Pixabay) em qualquer slide, por cima do layout; arraste, redimensione pelos cantos ou apague. Textos removidos voltam pelo menu **⋯ → Restaurar textos removidos**.
- **Arraste a foto** para reenquadrar.
- **Outro formato** refaz o slide em outro layout (o JEV escolhe o formato, a OpenAI reescreve).
- **Configurações → Estilo** troca a composição do post inteiro: Moderno, Minimalista, Rabisco, Jornal, Colagem, Suíço, Interface e cinco baseados em design systems (Orbital, Mangá, MDE, Neo Brutalista e Canvas, com as cores deles). **Visual** liga/desliga crédito das fotos, fonte, @, avatar, paginação e "Em resumo", e escolhe o conector entre slides (nenhum, reto, curvas, orgânico).
- **Arraste as bolinhas da linha** (conector) para mudar onde ela cruza de um slide para o outro; duplo clique volta ao original.
- No fim da geração, o canto inferior direito mostra o **custo estimado** (OpenAI + JEV, preços de tabela); passe o mouse para ver os tokens.
- Ctrl+Z / Ctrl+Shift+Z desfazem e refazem tudo.
- **Baixar** gera um .zip com os PNGs; **Copiar legenda** copia o texto do post (um parágrafo por linha, com uma linha em branco entre eles).
- **Publicar** (com a chave da Postproxy e o Instagram conectado nela) envia o carrossel como JPEG com a legenda, agora ou num horário agendado. O Instagram aceita até 10 imagens por carrossel: escolha quais slides vão.

## Estrutura

```
src/app/api/      scrape · generate (stream) · reformat · images · img (proxy) · track (Unsplash) · check · publish (Postproxy)
src/lib/          tipos, catálogo de formatos, schemas, prompts, cores, normalização
src/lib/server/   OpenAI, JEV, Postproxy, scraping, busca de imagens
src/lib/client/   ações (geração, imagens, slides), edições à mão, exportação, publicação
src/components/   Home, Editor, carrossel, barra do slide, configurações
src/components/slides/   canvas do slide, blocos editáveis/arrastáveis/redimensionáveis, guias magnéticas, imagens extras, 20 layouts, ícones, conector, objetos sem fundo
src/components/slides/styles/   composições de cada estilo
src/app/slide-styles/    CSS de cada estilo
```

O plano completo está em [PLANO.md](PLANO.md).

## Licença

[MIT](LICENSE). As fotos que o app busca continuam com a licença de cada fonte (Wikimedia, Unsplash, Pixabay); mantenha o crédito ligado quando a licença pedir.
