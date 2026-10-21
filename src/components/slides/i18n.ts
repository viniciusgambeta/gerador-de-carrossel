import type { CtaAction, CtaText, Language } from "@/lib/types";

/** Fixed words printed on slides, in the carousel language */
export const CHROME_TEXT = {
  "pt-BR": {
    swipe: "Arraste",
    summary: "Em resumo",
    actions: { save: "Salvar", like: "Curtir", comment: "Comentar", share: "Enviar", follow: "Seguir" },
  },
  en: {
    swipe: "Swipe",
    summary: "In short",
    actions: { save: "Save", like: "Like", comment: "Comment", share: "Share", follow: "Follow" },
  },
  es: {
    swipe: "Desliza",
    summary: "En resumen",
    actions: { save: "Guardar", like: "Me gusta", comment: "Comentar", share: "Enviar", follow: "Seguir" },
  },
} as const;

/** Used when switching to a call to action the model did not write (older carousels) */
export const CTA_DEFAULTS: Record<Language, Record<CtaAction, CtaText>> = {
  "pt-BR": {
    save: { title: "**Salve** este post para consultar depois", subtitle: "Para ter sempre à mão." },
    like: { title: "Toque **duas vezes** se isso te surpreendeu", subtitle: "Ajuda mais gente a ver." },
    comment: { title: "E você, o que acha disso? **Comente**!", subtitle: "Conta aqui embaixo." },
    share: { title: "**Envie** para alguém que precisa saber disso", subtitle: "Pode ajudar quem você ama." },
    follow: { title: "**Siga** para entender as notícias do dia", subtitle: "O que importa, em poucos slides." },
  },
  en: {
    save: { title: "**Save** this post for later", subtitle: "Keep it at hand." },
    like: { title: "Double-**tap** if this surprised you", subtitle: "It helps more people see it." },
    comment: { title: "What do you think? **Comment**!", subtitle: "Tell us below." },
    share: { title: "**Send** this to someone who needs to know", subtitle: "It might help someone you love." },
    follow: { title: "**Follow** for the news, explained", subtitle: "What matters, in a few slides." },
  },
  es: {
    save: { title: "**Guarda** este post para después", subtitle: "Para tenerlo a mano." },
    like: { title: "Toca **dos veces** si te sorprendió", subtitle: "Ayuda a que más gente lo vea." },
    comment: { title: "¿Y tú qué opinas? **Comenta**!", subtitle: "Cuéntanos aquí abajo." },
    share: { title: "**Envía** esto a quien necesita saberlo", subtitle: "Puede ayudar a alguien que quieres." },
    follow: { title: "**Sigue** para entender las noticias", subtitle: "Lo que importa, en pocos slides." },
  },
};
