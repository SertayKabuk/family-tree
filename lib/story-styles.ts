import type { Locale } from "@/i18n/config";

export const STORY_STYLES = {
  classic: {
    labelKey: "storyStyle.classic",
    descriptionKey: "storyStyle.classicDesc",
  },
  epic: {
    labelKey: "storyStyle.epic",
    descriptionKey: "storyStyle.epicDesc",
  },
  warmNostalgic: {
    labelKey: "storyStyle.warmNostalgic",
    descriptionKey: "storyStyle.warmNostalgicDesc",
  },
  humorous: {
    labelKey: "storyStyle.humorous",
    descriptionKey: "storyStyle.humorousDesc",
  },
  poetic: {
    labelKey: "storyStyle.poetic",
    descriptionKey: "storyStyle.poeticDesc",
  },
  documentary: {
    labelKey: "storyStyle.documentary",
    descriptionKey: "storyStyle.documentaryDesc",
  },
} as const;

export type StoryStyle = keyof typeof STORY_STYLES;

export const DEFAULT_STORY_STYLE: StoryStyle = "classic";

const styleInstructionsByLocale: Record<Locale, Record<StoryStyle, string>> = {
  tr: {
    classic: `Üslup: Ansiklopedik ama sıcak. Resmi ve yapılandırılmış, tarihler ve olaylar belirgin şekilde yer almalı.`,
    epic: `Üslup: Destansı ve görkemli. Aile üyelerini kahramanlar gibi anlat, başarılarını ve mücadelelerini büyük bir destan gibi kurgula. Güçlü ve etkileyici bir dil kullan.`,
    warmNostalgic: `Üslup: Sıcak ve nostaljik. Sanki bir büyükannenin veya büyükbabanın torunlarına anlattığı gibi, sevgi dolu, özlem dolu ve samimi bir anlatım. Küçük detaylara ve anılara önem ver.`,
    humorous: `Üslup: Esprili ve eğlenceli. Aile hikayelerini gülümseten bir şekilde anlat. Karakterlerin komik alışkanlıklarını, ailece yaşanan eğlenceli anıları ön plana çıkar. Saygılı ama neşeli bir ton kullan.`,
    poetic: `Üslup: Şiirsel ve lirik. Zengin benzetmeler, metaforlar ve imgelerle süslenmiş, edebî bir dil kullan. Duyguları ve atmosferi ön plana çıkar.`,
    documentary: `Üslup: Belgesel tarzı, objektif ve araştırmacı. Tarihsel bağlamı ön plana çıkar, dönemin koşullarını ve toplumsal olaylarla bağlantıları vurgula. Gazeteci bakış açısıyla anlat.`,
  },
  en: {
    classic: `Style: Encyclopedic yet warm. Formal and structured, with dates and events prominently featured.`,
    epic: `Style: Epic and grand. Portray family members as heroes, frame their achievements and struggles as a great saga. Use powerful and impactful language.`,
    warmNostalgic: `Style: Warm and nostalgic. As if a grandparent is telling stories to grandchildren — loving, wistful, and intimate. Pay attention to small details and memories.`,
    humorous: `Style: Witty and entertaining. Tell family stories in a way that brings smiles. Highlight characters' funny habits and amusing family moments. Use a respectful but cheerful tone.`,
    poetic: `Style: Poetic and lyrical. Use rich similes, metaphors, and imagery in a literary language. Foreground emotions and atmosphere.`,
    documentary: `Style: Documentary-style, objective and investigative. Foreground historical context, emphasize the conditions of the era and connections to societal events. Narrate from a journalist's perspective.`,
  },
};

const additionalInstructionsLabel: Record<Locale, string> = {
  tr: "Ek Yönergeler",
  en: "Additional Instructions",
};

export function getStylePromptInstructions(
  style: StoryStyle,
  locale: Locale,
  customPrompt?: string | null
): string {
  const instructions = styleInstructionsByLocale[locale]?.[style]
    ?? styleInstructionsByLocale.tr[style];

  let result = instructions;

  if (customPrompt?.trim()) {
    const label = additionalInstructionsLabel[locale] ?? additionalInstructionsLabel.tr;
    result += `\n\n${label}: ${customPrompt.trim()}`;
  }

  return result;
}

export interface StoryPromptConfig {
  locale: Locale;
  style: StoryStyle;
  customPrompt?: string | null;
}

const memberPrompts: Record<Locale, (styleInstructions: string, context: string) => string> = {
  tr: (styleInstructions, context) => `Sen bir aile tarihçisisin. Aşağıdaki aile üyesi hakkında iki farklı metin yaz:

${styleInstructions}

1. formalStory: Yukarıdaki üsluba uygun, yapılandırılmış bir biyografi. Tarihler, yerler ve başarılar belirgin şekilde yer almalı. 350-450 kelime.

2. narrativeStory: Aynı üslupla, sözlü anlatım tarzında, sesli okunmak üzere tasarlanmış bir hikaye. Akıcı ve doğal olmalı. Yazılı formatlamadan kaçın (madde işareti, başlık vb. yok). 250-350 kelime.

Her iki metin de:
- Türkçe olmalı
- Yalnızca verilen bilgilere dayanmalı, spekülatif bilgi eklenmemeli
- Tüm mevcut bilgileri (biyografi, ilişkiler, olaylar, fotoğraf açıklamaları, belgeler) doğal şekilde içermeli

Aile Üyesi Bilgileri:
${context}`,
  en: (styleInstructions, context) => `You are a family historian. Write two different texts about the following family member:

${styleInstructions}

1. formalStory: A structured biography following the style above. Dates, places, and achievements should be prominently featured. 350-450 words.

2. narrativeStory: A story in the same style, designed for oral narration and to be read aloud. It should be fluent and natural. Avoid written formatting (no bullet points, headings, etc.). 250-350 words.

Both texts must:
- Be written in English
- Be based only on the provided information, no speculative details
- Naturally incorporate all available information (biography, relationships, events, photo descriptions, documents)

Family Member Information:
${context}`,
};

const treePrompts: Record<Locale, (styleInstructions: string, context: string, formalWordMin: number, formalWordMax: number, narrativeWordMin: number, narrativeWordMax: number) => string> = {
  tr: (styleInstructions, context, formalWordMin, formalWordMax, narrativeWordMin, narrativeWordMax) => `Sen bir aile tarihçisisin. Aşağıdaki aile ağacının tamamı hakkında iki farklı metin yaz:

${styleInstructions}

1. formalStory: Yukarıdaki üsluba uygun, yapılandırılmış bir aile tarihi anlatımı. Ailenin kökenleri, nesiller arası bağlantılar, önemli olaylar ve ailenin genel hikayesi bir bütün olarak ele alınmalı. Her üyeyi ayrı ayrı anlatmak yerine, aileyi bir bütün olarak anlatan, nesiller arası ilişkileri ve ortak hikayeyi öne çıkaran bir metin olmalı. ${formalWordMin}-${formalWordMax} kelime.

2. narrativeStory: Aynı üslupla, sözlü anlatım tarzında, sesli okunmak üzere tasarlanmış bir aile hikayesi. Akıcı ve doğal olmalı. Ailenin kuşaklar boyunca devam eden hikayesini anlatmalı. Yazılı formatlamadan kaçın (madde işareti, başlık vb. yok). ${narrativeWordMin}-${narrativeWordMax} kelime.

Her iki metin de:
- Türkçe olmalı
- Yalnızca verilen bilgilere dayanmalı, spekülatif bilgi eklenmemeli
- Aile üyelerini birbirleriyle olan ilişkileri üzerinden doğal bir şekilde hikayeye dahil etmeli
- Ailenin bir bütün olarak hikayesini anlatmalı

Aile Ağacı Bilgileri:
${context}`,
  en: (styleInstructions, context, formalWordMin, formalWordMax, narrativeWordMin, narrativeWordMax) => `You are a family historian. Write two different texts about the entire family tree below:

${styleInstructions}

1. formalStory: A structured family history narrative following the style above. The family's origins, generational connections, important events, and the overall family story should be addressed as a whole. Rather than describing each member individually, the text should tell the family's story as a unified narrative, highlighting intergenerational relationships and shared history. ${formalWordMin}-${formalWordMax} words.

2. narrativeStory: A family story in the same style, designed for oral narration and to be read aloud. It should be fluent and natural. It should tell the story of the family across generations. Avoid written formatting (no bullet points, headings, etc.). ${narrativeWordMin}-${narrativeWordMax} words.

Both texts must:
- Be written in English
- Be based only on the provided information, no speculative details
- Naturally incorporate family members through their relationships with each other
- Tell the family's story as a whole

Family Tree Information:
${context}`,
};

export function buildMemberStoryPrompt(config: StoryPromptConfig, context: string): string {
  const styleInstructions = getStylePromptInstructions(config.style, config.locale, config.customPrompt);
  const builder = memberPrompts[config.locale] ?? memberPrompts.tr;
  return builder(styleInstructions, context);
}

export function buildTreeStoryPrompt(
  config: StoryPromptConfig,
  context: string,
  memberCount: number
): string {
  const styleInstructions = getStylePromptInstructions(config.style, config.locale, config.customPrompt);
  const formalWordMin = Math.min(350 + memberCount * 50, 1000);
  const formalWordMax = Math.min(450 + memberCount * 50, 1200);
  const narrativeWordMin = Math.min(250 + memberCount * 40, 800);
  const narrativeWordMax = Math.min(350 + memberCount * 40, 1000);
  const builder = treePrompts[config.locale] ?? treePrompts.tr;
  return builder(styleInstructions, context, formalWordMin, formalWordMax, narrativeWordMin, narrativeWordMax);
}
