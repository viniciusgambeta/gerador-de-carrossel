# Gerador de Carrossel — Plano de desenvolvimento

## 1. Visão do produto
Cole o link de uma notícia → em segundos um carrossel 1080×1350 (4:5, Instagram) pronto, editável e exportável.
Princípio guia: **o mínimo de cliques e de informação na tela**. Tudo centralizado, animado e reversível (Ctrl+Z).

## 2. Stack
| Camada | Escolha | Por quê |
|---|---|---|
| App | Next.js 16 (App Router) + React 19 + TypeScript | Front + API (scraping precisa de servidor por CORS) em um único `npm run dev` |
| Estilo | Tailwind v4 + CSS variables | Slides lêem variáveis de tema → base para a futura galeria de estilos |
| Animação | motion (framer-motion) | Transições do carrossel, morph do input, drawer, toasts |
| Estado | zustand (+ persist) + immer | Configurações e último carrossel salvos no navegador; histórico de desfazer/refazer |
| Scraping | jsdom + @mozilla/readability + JSON-LD + fallback r.jina.ai | Funciona na maioria dos portais, inclusive os que renderizam via JS |
| IA generativa | OpenAI Chat Completions, Structured Outputs (JSON Schema estrito) **em streaming** | Slides aparecem um a um enquanto são escritos |
| IA de decisão | **JEV (TypeSafe)** `/v1/systemone` | Decisões rápidas e baratas, sem gerar texto (ver §5) |
| Imagens | Wikipédia (foto principal dos artigos) + Wikimedia Commons, Unsplash opcional | Sem chave para nomes próprios e conceitos; Unsplash para cenas com qualidade de banco de imagens. (Pexels saiu: parou de emitir chaves novas.) |
| Exportação | html-to-image + JSZip | PNG 1080×1350 por slide, .zip em 1 clique |

Chaves (OpenAI, Pexels, JEV) ficam no `localStorage` e vão por header para as rotas locais da API. Sem autenticação.

## 3. Fluxo
```
[colar link] ─auto-inicia─► /api/scrape ──► /api/generate (stream) ──► slides surgem ao vivo
                             │  Readability/JSON-LD/Jina            │  a cada slide completo:
                             │  JEV: é notícia? é sensível? editoria │  /api/images → Pexels+Commons → JEV escolhe
                             ▼                                       ▼
                       artigo limpo                           carrossel pronto → editar / exportar
```

## 4. Modelo de slides (formatos)
O primeiro é sempre **Capa**, o último sempre **CTA**: "Em resumo:" (termos importantes em negrito sublinhado) + uma de 5 chamadas com subtítulo curto (salvar com seta para o botão de salvar, curtir com dois toques, comentar com uma pergunta da notícia, enviar, seguir). A IA escreve as 5 e recomenda uma; o botão **Trocar CTA** alterna entre elas. O carrossel tem de 4 a 13 slides. No meio a IA escolhe entre 18 formatos genéricos, pelo conteúdo de cada trecho e nunca por cota de variedade:

| Formato | Uso |
|---|---|
| `text` | Título + explicação, com foto opcional: o formato de explicar |
| `statement` | Frase de impacto em tipografia gigante (virada, conclusão) |
| `stat` | Um único número com o que ele mede (barra só quando é parte de um todo) |
| `duo` | Dois números lado a lado (dois grupos, antes/depois, alta × queda) |
| `compare` | Duas situações lado a lado com pontos |
| `quote` | Citação literal; de pessoa pública sempre com a foto dela (busca pelo nome) |
| `versus` | Dois lados em conflito (pessoas, países, empresas): duas fotos, selo VS e a posição de cada um |
| `profile` | Pessoa ou organização central, com foto |
| `explainer` | "O que é": termo, definição simples e exemplo |
| `qa` | Pergunta que o leitor faria + resposta |
| `list` | 3–5 itens com ícone |
| `grid` | 4 pontos-chave em grade com ícones |
| `steps` | Passo a passo numerado |
| `timeline` | Sequência de eventos com datas |
| `chart` | 3–5 números comparáveis em barras |
| `diagram` | Cadeia causa → efeito com ícones |
| `question` | Pergunta-gancho respondida no slide seguinte |
| `image` | Foto em tela cheia com legenda |

Ícones: 77 ícones (lucide) escolhidos pela IA por significado; emojis ficam para frases de impacto.
Chrome discreto: favicon + nome do site no canto superior esquerdo, número da página no direito, @ e seta pequenos no rodapé.

Cada slide também tem um **tom de fundo** (`light`, `dark`, `brand`) que alterna para criar ritmo. Destaques de texto usam `**palavra**`.
Elementos fixos de retenção: barra de progresso no topo, @ + foto no rodapé, "arraste →" na capa e seta nos slides.

Regras da IA: só fatos do texto (citações literais, nada de números inventados), até ~25 palavras por slide, sem repetir formato em sequência, tom sóbrio e sem emoji em notícias sensíveis. Ela também escreve a **legenda do post** com hashtags.

**Voz:** o carrossel inteiro é um texto só, casual e didático, dividido em slides; títulos conectam ("Até aqui, …!", "Foram mapeados alguns hábitos:", "?!"); destaques também nos parágrafos; números sempre em algarismos; nunca travessões (removidos automaticamente se aparecerem).

**Didática:** explicar em vez de anunciar, para quem não leu a notícia; termos técnicos explicados na hora; frases completas; pergunta sempre com "?" (corrigido automaticamente quando o título começa como pergunta); números ditos em palavras e sem símbolos (≥, /, +X%); sem limite rígido de caracteres. A opção "Caprichado" (padrão) dá mais tempo de raciocínio ao modelo.

**Continuidade:** antes dos slides, a IA escreve a notícia como uma mini-narrativa (`story`, um trecho por slide) em que cada trecho continua o anterior; os slides são escritos a partir dela, com conectivos ("Mas…", "O motivo?", "Na prática…") e títulos que são frases completas, nunca rótulos. O "Outro formato" recebe o carrossel inteiro em ordem para manter o encadeamento.

## 5. Onde entra o JEV (com fallback heurístico quando não há chave)
1. **Validação do scraping**: "isso é o texto de uma notícia ou paywall/cookie/erro?" → se não for, tenta o leitor alternativo.
2. **Análise da pauta** (mesma chamada): notícia sensível? qual editoria? → muda o tom do prompt e a preferência de fonte de imagem.
3. **Escolha de imagem**: entre ~12 candidatas (Pexels + Commons), qual ilustra melhor o slide.
4. **"Outro formato"**: escolhe o formato que melhor apresenta aquele conteúdo; a OpenAI só reescreve no formato escolhido (schema menor = resposta mais rápida).

## 6. Edição (pensada para 2 cliques)
- **Duplo clique** em qualquer texto → edita no lugar (Enter confirma, Esc cancela, Ctrl+B destaca).
- **Arrastar** qualquer bloco → reposiciona. **Clique** seleciona: alças nas laterais mudam a largura (`w`, o texto quebra de novo), em cima/embaixo a altura (`h`, o texto encolhe para caber via `--bfit`), nos cantos as duas; na vertical o bloco segue o fluxo do slide (os vizinhos acompanham em vez de sobrepor). Barra do bloco: A−/A+ (teclas + e −), tamanho automático, voltar ao original, remover (Delete; volta pelo menu "Restaurar textos removidos", `hidden`). Setas movem finamente.
- **Guias magnéticas**: ao arrastar ou redimensionar, bordas e centro grudam (7 px de tela) no centro e nas margens do slide e nas bordas/centros dos outros blocos e imagens; a linha travada aparece em rosa. Alt solta o ímã.
- **Ajustes lembrados**: cada mudança de posição/tamanho/fonte também vai para `layoutMemory["estilo:formato"][bloco]` nas configurações; slides novos (geração e "Outro formato") nascem com esses ajustes. Liga/desliga e "esquecer" em Visual.
- **Imagens extras** (`extras`): "Inserir imagem" busca fotos ou objetos sem fundo (Pixabay) ou envia do computador (PNG mantém a transparência); a imagem entra no centro, arrasta com ímã, redimensiona pelos cantos mantendo a proporção.
- **Arrastar a foto** → reenquadra a imagem.
- Barra do slide: **Outro formato** · Imagem (busca/troca/upload; no MDE também o fundo da frase de impacto) · Inserir imagem · Fundo (alterna tom) · Baixar slide · Excluir.
- Ctrl+Z / Ctrl+Shift+Z em tudo. Excluir mostra toast com "Desfazer".

## 7. UX/UI
- Home: uma frase + um campo. **Colar um link já inicia** (sem clicar em nada). "Continuar último" discreto quando existir.
- Geração: o campo vira uma pílula no topo; os slides entram animados conforme são escritos; status curto ("Lendo a notícia…", "Escrevendo slide 3…").
- Carrossel centralizado com os vizinhos aparecendo nas laterais; setas, teclado, swipe e pontos.
- Configurações em painel lateral com salvamento automático, em abas: **Perfil** (@, foto, logo), **Estilo** (galeria de estilos), **Visual** (cores e o que aparece no slide), **Chaves** (teste ao vivo), **Geração** (qualidade, modelo, idioma).
- **Exibir no slide**: liga/desliga crédito das imagens, fonte da notícia, assinatura (@), avatar (quadrado com canto arredondado), paginação e o **"Em resumo"** do último slide (sem ele, o título da chamada cresce e ocupa o slide).
- **Conector entre slides**: Nenhum, Reto, Curvas ou Orgânico (aba Visual).
- Se faltar a chave da OpenAI, o painel abre focado no campo, em vez de mostrar erro.
- Enquanto a IA lê e planeja, uma barra de progresso enche rápido e depois anda devagar entre 90% e 97% até o primeiro slide chegar (não há porcentagem real para mostrar).
- **Publicar** (Postproxy): com a chave da Postproxy, o botão Publicar abre a conta do Instagram conectada, a escolha de até 10 slides (o padrão é o começo + a chamada final), a legenda e "agora" ou "agendar". Os slides vão como JPEG (multipart para `POST /api/posts`, `post[scheduled_at]` para agendar); depois o app acompanha o status até o Instagram confirmar.
- **Legenda**: um parágrafo por linha, com linha em branco entre eles (o prompt pede e `formatCaption` garante).
- **Custo estimado**: ao terminar, o canto inferior direito mostra quanto aquele carrossel custou (OpenAI + JEV, preços de tabela); detalhes ao passar o mouse. O servidor mede os tokens de cada requisição (`x-usage`, ou um marcador no fim do streaming) e o cliente soma por carrossel, fora do desfazer.

### Estilos de post
Cada estilo tem **composições próprias** para os formatos principais (capa, texto, citação, frase, número, lista, CTA e, em alguns, grade e dois números), além de fontes, ornamentos e o tratamento dos demais formatos em CSS. Os cinco últimos seguem design systems fornecidos e usam as cores deles; os outros usam a paleta do usuário. Folhas com os 21 modelos de cada estilo, numerados, são geradas localmente em `previews/estilos` (fora do repositório).

| Estilo | Composição |
|---|---|
| Moderno | O padrão: tipografia forte, cards arredondados, fotos em tela cheia |
| Minimalista | Margens largas, letra fina ancorada embaixo, fios no lugar de caixas; capa com a foto ocupando toda a parte de cima, texto com foto grande saindo pela direita |
| Rabisco | Caderno: capa com foto colada torta por fita transparente, citação em balão desenhado (aberto onde nasce o rabicho), número circulado à mão, lista com checkbox, post-its |
| Jornal | Primeira página: tarja da editoria, manchete centralizada, linha fina entre fios e a foto do dia; texto em colunas com capitular, pull quote entre fios |
| Colagem | Fotos rasgadas com fita, texto em tiras de papel, etiquetas de rotuladora, adesivos de explosão, retícula, fontes misturadas |
| Suíço | Grade de 6 colunas, foto sangrada, aspas e números gigantes, texto em cima e embaixo com tensão no meio |
| Interface | Foto em janela, citação como chat, frase em terminal, número em widget, lista como notificações |
| Orbital | (Orbital Command) painéis de telemetria com cantoneiras, mira sobre a foto, log de eventos, órbitas |
| Mangá | (Manga Ink) página de quadrinho com sarjetas diagonais, retícula, balão apontando para quem fala (mesmo desenho de balão do Rabisco, em tinta), explosão de impacto; a faixa amarela só aparece de vez em quando |
| MDE | (Me dá um Exemplo) fotos em destaque sob degradê roxo (capa, texto, citação e frase de impacto, que usa a foto da capa), título condensado, emojis no lugar de ícones, exemplo em bloco coral com seta, VS em duas colunas com divisor, rótulos dentro das barras do gráfico |
| Neo Brutalista | (Neo Brutalist) tudo em cards com borda e sombra sólida: card de curso, aviso destacado, selo, lista empilhada |
| Canvas | (inspirado no Figma) o post montado no editor: tela pontilhada, frames retos com nome, seleções com alças e medida real, foto da capa em modo de corte, medidas de espaçamento em vermelho, barra de texto, comentários (pergunta e resposta, exemplo, resumo), painel de camadas na lista, cursores com nome; destaque como texto selecionado |

As capas do Rabisco (foto colada torta, saindo da tela) e da Colagem (foto rasgada saindo da tela, manchete em tiras de papel por cima) também deixam a foto parcialmente fora do slide.

**Conector**: uma linha entra pela borda esquerda, desce pela margem, corre por baixo do conteúdo, sobe pela margem direita e sai na altura em que o próximo slide a recebe, então os slides se emendam ao deslizar. O usuário escolhe o formato (reto, curvas, orgânico); cada estilo desenha o traço (à mão com laço, pontilhado, costura, barra, circuito com nós…). Com o conector ligado, o conteúdo guarda mais margem embaixo (`safeBottom`), e a linha corre entre o conteúdo e o rodapé. No editor, alças arrastáveis mudam a altura de cada cruzamento (guardada no slide da esquerda, `link.out`, para os dois vizinhos concordarem), o trecho de baixo (`link.run`) e, na capa, o ponto onde a linha começa, livre em qualquer lugar (`link.start`); duplo clique volta ao padrão. Margem com o conector: `safeBottom` 252.

**Espaços vazios**: texto curto num FitBox grande cresce até ~1,34× (menos no Minimalista e em capa, citação, foto, VS e CTA). Slides sem foto ganham um objeto sem fundo do Pixabay (`cutout`, 2 ou 3 por carrossel) ou, sem ele, o ícone que a IA escolheu para o slide (`icon` → `fillIcon`), desenhado grande no maior espaço livre acima ou abaixo do texto, medido depois do layout. Em número e pergunta-gancho o texto fica centralizado e o objeto vai para o canto inferior direito, por cima da linha, do maior tamanho que o texto permitir (pode apoiar no canto vazio de um card); as margens transparentes do PNG são descontadas para ele preencher o espaço. Nada vai por cima de foto em tela cheia; cada estilo trata o objeto/ícone (adesivo, retícula, sombra dura, brilho). O proxy guarda uma cópia local das imagens do Pixabay (os links expiram em 24 h).

## 8. Estrutura
```
src/app/            page, layout, globals.css
src/app/api/        scrape · generate · reformat · images · img (proxy) · check-keys · models
src/lib/            types, layouts (catálogo), schema, prompts, openai, jev, scrape, images, postprocess, color, richtext
src/store/          settings, carousel (com histórico)
src/components/     Home, CarouselView, SlideCanvas, slides/*, SlideToolbar, ImagePicker, SettingsDrawer, ExportStage, Toaster
```

## 9. Futuro (já preparado)
- Novos estilos: um id em `src/lib/styles.ts`, as cores em `slideTheme` (`src/lib/color.ts`), composições em `components/slides/styles/<estilo>.tsx` (registradas em `styles/index.ts`), ornamentos em `slides/decor.tsx`, o traço do conector em `slides/connector.tsx` e a folha `app/slide-styles/<estilo>.css`.
- SVG dentro dos slides: estilos de `fill`/`stroke` vão no próprio `<svg>` ou em atributos, porque a exportação (html-to-image) copia o `<svg>` sem processar o CSS dos filhos.
- Reordenar slides arrastando, adicionar slide manual, formatos 1:1 e 9:16, recorte inteligente com `box` do JEV.
