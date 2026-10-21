"use client";

import { useCarousel } from "@/store/carousel";
import { useSettings } from "@/store/settings";
import { loadCutout, loadImage } from "./client/actions";
import type { Carousel, Slide } from "./types";

/**
 * Sample carousel with every layout (open the app with ?demo).
 * Fictional data, used to preview layouts and editing without API keys.
 */
const base = { image: null, imageQuery: null } as const;

const slides: Slide[] = [
  {
    id: "cover",
    layout: "cover",
    tone: "dark",
    image: null,
    imageQuery: { query: "solar panels field sunset", entity: "Photovoltaic power station", broad: "solar energy" },
    kicker: "Exemplo",
    title: "A energia do sol passou a mover o Brasil. E a sua **conta de luz**?",
    subtitle: "O que a virada solar muda no seu bolso a partir do ano que vem.",
  },
  {
    id: "s0",
    layout: "text",
    tone: "light",
    image: null,
    imageQuery: { query: "solar farm aerial", entity: "Solar power in Brazil", broad: "solar energy" },
    kicker: "O que aconteceu",
    title: "Em um ano, o país instalou mais **painéis solares** do que em toda a década passada",
    body: "A maior parte foi em telhados de casas e pequenos comércios, e não em grandes usinas.",
  },
  {
    id: "s1",
    ...base,
    layout: "explainer",
    tone: "dark",
    kicker: "O que é",
    term: "Geração distribuída",
    definition: "É quando a energia é produzida perto de onde é consumida, como os painéis no telhado de uma casa, em vez de vir de uma grande usina distante.",
    example: "Uma padaria com painéis no telhado gera parte da própria energia durante o dia.",
    icon: "home",
  },
  {
    id: "s2",
    ...base,
    layout: "stat",
    tone: "light",
    kicker: "O tamanho da virada",
    value: "24%",
    label: "de toda a eletricidade do país já vem do sol",
    context: "Em 2019, a fatia era menor que 2%.",
    share: 24,
    cutoutQuery: "solar panel",
    fillIcon: "sun",
  },
  {
    id: "s3",
    ...base,
    layout: "duo",
    tone: "brand",
    title: "Por que tanta gente instalou: o painel ficou **mais barato** e a conta, mais cara",
    left: { value: "60% menor", label: "preço médio de um painel solar em cinco anos", icon: "fall" },
    right: { value: "35% maior", label: "valor médio da conta de luz no mesmo período", icon: "rise" },
    note: "Dados fictícios para demonstração.",
  },
  {
    id: "s4",
    ...base,
    layout: "qa",
    tone: "light",
    question: "E quem não tem telhado próprio também se beneficia?",
    answer: "Sim, de forma indireta: quanto mais energia solar entra na rede, menos o país depende de usinas a gás, que são mais caras e encarecem a conta de todos.",
    fillIcon: "home",
  },
  {
    id: "s5",
    ...base,
    layout: "grid",
    tone: "dark",
    title: "Quatro motivos que explicam a **explosão** solar",
    items: [
      { icon: "money", title: "Preço", text: "Painéis custam menos da metade do que custavam." },
      { icon: "sun", title: "Sol forte", text: "O Brasil tem sol o ano inteiro em quase todo o território." },
      { icon: "savings", title: "Crédito", text: "Bancos passaram a financiar a instalação em parcelas." },
      { icon: "justice", title: "Regras", text: "A lei garante desconto na conta pela energia gerada." },
    ],
  },
  {
    id: "s6",
    ...base,
    layout: "steps",
    tone: "light",
    title: "Como a energia do telhado vira **desconto** na conta?",
    steps: [
      { title: "O painel gera energia", text: "Durante o dia, a casa usa o que precisa." },
      { title: "A sobra vai para a rede", text: "O excedente segue para a distribuidora." },
      { title: "Vira crédito", text: "A distribuidora registra a energia que você forneceu." },
      { title: "Abate na fatura", text: "À noite, você usa a rede e o crédito é descontado." },
    ],
  },
  {
    id: "s7",
    layout: "profile",
    tone: "dark",
    image: null,
    imageQuery: { query: "hydroelectric dam", entity: "Itaipu Dam", broad: "dam" },
    name: "Itaipu",
    role: "Usina hidrelétrica",
    text: "Na fronteira com o Paraguai, segue como a principal fonte de energia do país, mas já divide espaço com o sol.",
  },
  {
    id: "s8",
    ...base,
    layout: "quote",
    tone: "light",
    quote: "A virada não veio das grandes usinas, veio dos **telhados**.",
    author: "Especialista em energia",
    role: "Exemplo de citação",
  },
  {
    id: "s8b",
    image: null,
    imageQuery: { query: "", entity: "Thomas Edison" },
    layout: "quote",
    tone: "dark",
    quote: "Eu apostaria meu dinheiro no **sol** e na energia solar. Que fonte de energia!",
    author: "Thomas Edison",
    role: "Inventor, em conversa de 1931",
  },
  {
    id: "s9",
    ...base,
    layout: "list",
    tone: "brand",
    title: "O que muda para quem paga a conta",
    items: [
      { icon: "fall", text: "Bandeiras tarifárias tendem a pesar menos no verão." },
      { icon: "energy", text: "Menos risco de apagão nos horários de sol." },
      { icon: "home", text: "Quem instala painéis pode zerar parte da fatura." },
    ],
  },
  {
    id: "s10",
    ...base,
    layout: "timeline",
    tone: "light",
    title: "O que vem pela frente",
    events: [
      { when: "Janeiro", text: "Começam a valer novas regras de compensação." },
      { when: "Março", text: "Governo faz o primeiro leilão de baterias." },
      { when: "2027", text: "A meta é chegar a 30% da matriz elétrica." },
    ],
  },
  {
    id: "s11",
    ...base,
    layout: "compare",
    tone: "dark",
    title: "Antes e **depois** da virada",
    left: { label: "2019", icon: "factory", points: ["Solar era quase inexistente", "A conta subia na seca"] },
    right: { label: "Hoje", icon: "sun", points: ["1 em cada 4 kWh é solar", "Menos dependência da chuva"] },
  },
  {
    id: "s11b",
    layout: "versus",
    tone: "dark",
    image: null,
    imageQuery: { query: "", entity: "Photovoltaic power station" },
    imageStatus: "idle",
    image2: null,
    imageQuery2: { query: "", entity: "Thermal power station" },
    imageStatus2: "idle",
    title: "E aí começou a **briga** pelo mercado de energia:",
    left: { name: "Energia solar", stance: "Quer mais incentivo para quem gera em casa." },
    right: { name: "Usinas a gás", stance: "Defendem pagar menos pela energia dos telhados." },
    note: "Exemplo fictício para demonstrar o formato.",
  },
  {
    id: "s12",
    ...base,
    layout: "chart",
    tone: "light",
    title: "A capacidade solar mais que **quadruplicou** em quatro anos",
    bars: [
      { label: "2021", value: 13, display: "13 GW" },
      { label: "2023", value: 37, display: "37 GW" },
      { label: "2025", value: 58, display: "58 GW" },
    ],
    note: "Dados fictícios para demonstração.",
  },
  {
    id: "s13",
    ...base,
    layout: "diagram",
    tone: "brand",
    title: "Como o sol chega ao seu bolso?",
    nodes: [
      { icon: "sun", text: "Mais energia solar entra na rede." },
      { icon: "fuel", text: "As usinas a gás, mais caras, ligam menos." },
      { icon: "money", text: "O custo médio da energia cai." },
    ],
  },
  {
    id: "s14",
    ...base,
    layout: "statement",
    tone: "dark",
    emoji: "☀️",
    text: "Pela primeira vez, o **sol** pesa mais na conta do que a chuva.",
  },
  {
    id: "s15",
    ...base,
    layout: "question",
    tone: "brand",
    question: "E quando o sol **se põe**?",
    hint: "É aí que entram as baterias.",
    cutoutQuery: "battery",
    fillIcon: "energy",
  },
  {
    id: "s16",
    layout: "image",
    tone: "dark",
    image: null,
    imageQuery: { query: "rooftop solar panels houses", entity: "Rooftop solar power", broad: "solar panels" },
    caption: "Os telhados residenciais já somam **metade** de toda a potência solar do país.",
  },
  {
    id: "cta",
    ...base,
    layout: "cta",
    tone: "brand",
    takeaway: "A energia solar ficou barata, cresceu rápido e já ajuda a segurar a conta de luz. O próximo passo são as baterias, para guardar o sol para a noite.",
    title: "**Salve** este post para consultar antes de instalar",
    subtitle: "Ele tem o passo a passo de como o painel vira desconto na conta.",
    action: "save",
    options: {
      save: {
        title: "**Salve** este post para consultar antes de instalar",
        subtitle: "Ele tem o passo a passo de como o painel vira desconto na conta.",
      },
      like: { title: "Toque **duas vezes** se você já pensou em ter painéis", subtitle: "Seu like ajuda mais gente a entender a conta de luz." },
      comment: { title: "Você instalaria painéis solares na sua **casa**?", subtitle: "Conta aqui embaixo o que te faz querer (ou não)." },
      share: { title: "**Envie** para aquele amigo que reclama da conta de luz", subtitle: "Pode ser a explicação que faltava para ele." },
      follow: { title: "**Siga** para entender as notícias que mexem no seu bolso", subtitle: "Toda semana, o que importa explicado em poucos slides." },
    },
  },
];

export function loadDemo() {
  const carousel: Carousel = {
    id: "demo",
    createdAt: Date.now(),
    topic: "Energia",
    story: [],
    caption: "☀️ Exemplo de legenda gerada.\n\nAs fontes renováveis mudaram de patamar.\n\nVocê instalaria painéis em casa?\n\nFonte: Exemplo\n#energia #solar #exemplo",
    article: {
      url: "https://g1.globo.com/exemplo",
      title: "Exemplo — dados fictícios para demonstrar os formatos",
      description: "",
      siteName: "g1",
      author: "",
      publishedAt: "",
      lang: "pt-BR",
      text: "Texto de exemplo.",
      favicon: null,
      via: "direct",
      analysis: { sensitive: false, category: "economy" },
    },
    slides,
  };
  const st = useCarousel.getState();
  st.begin(carousel.article.url);
  st.setCarousel(carousel);
  st.setStatus("ready");
  st.setActive(0, false);
  slides.forEach((s) => {
    if (s.imageQuery) loadImage(s.id);
    if (s.imageQuery2) loadImage(s.id, 2);
    // Objects with no background need a Pixabay key
    if (s.cutoutQuery && useSettings.getState().keys.pixabay?.trim()) loadCutout(s.id);
  });
}
