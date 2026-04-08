import type { Locale } from "@/i18n/config";

interface ContextLabels {
  name: string;
  nickname: string;
  gender: string;
  birthDate: string;
  deathDate: string;
  occupation: string;
  biography: string;
  relationships: string;
  reverse: string;
  factsAndStories: string;
  source: string;
  photo: string;
  photos: string;
  documents: string;
  audioClips: string;
  treeName: string;
  treeDescription: string;
  totalMembers: string;
}

export const contextLabels: Record<Locale, ContextLabels> = {
  tr: {
    name: "Ad",
    nickname: "Lakap",
    gender: "Cinsiyet",
    birthDate: "Doğum Tarihi",
    deathDate: "Vefat Tarihi",
    occupation: "Meslek",
    biography: "Biyografi",
    relationships: "İlişkiler",
    reverse: "karşılık",
    factsAndStories: "Bilgiler ve Hikayeler",
    source: "Kaynak",
    photo: "Fotoğraf",
    photos: "Fotoğraflar",
    documents: "Belgeler",
    audioClips: "Ses Kayıtları",
    treeName: "Aile Ağacı Adı",
    treeDescription: "Açıklama",
    totalMembers: "Toplam Üye Sayısı",
  },
  en: {
    name: "Name",
    nickname: "Nickname",
    gender: "Gender",
    birthDate: "Birth Date",
    deathDate: "Death Date",
    occupation: "Occupation",
    biography: "Biography",
    relationships: "Relationships",
    reverse: "reverse",
    factsAndStories: "Facts and Stories",
    source: "Source",
    photo: "Photo",
    photos: "Photos",
    documents: "Documents",
    audioClips: "Audio Clips",
    treeName: "Family Tree Name",
    treeDescription: "Description",
    totalMembers: "Total Members",
  },
};

const dateLocaleTags: Record<Locale, string> = {
  tr: "tr-TR",
  en: "en-US",
};

export function getDateLocaleTag(locale: Locale): string {
  return dateLocaleTags[locale] ?? dateLocaleTags.tr;
}
