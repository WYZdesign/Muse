"use client";

/**
 * Shared, per-value icon lookups for the app's personality-trait system
 * (zodiac, MBTI, life path, Chinese zodiac). Torreé's ask: no generic
 * emoji standing in for a specific trait value (one 🧠 for all 16 MBTI
 * types, one 🐉 for all 12 Chinese animals, a hardcoded ♈ shown for
 * every zodiac sign regardless of what the person actually picked) —
 * every value gets its own accurate glyph or vector icon instead.
 *
 * Zodiac uses the real Unicode astrological glyphs (one distinct symbol
 * per sign — not a colorful emoji pictograph, a proper symbol). MBTI,
 * life path, and Chinese zodiac use react-icons vector components, one
 * per value, picked to fit that value's actual meaning rather than
 * reused wholesale. This is the single source of truth other screens
 * should import from instead of hardcoding their own icon per trait.
 */

import type { IconType } from "react-icons";
import {
  FiTarget, FiCpu, FiTrendingUp, FiEdit3, FiEye, FiFeather, FiUsers, FiSmile,
  FiCheckSquare, FiShield, FiBriefcase, FiHeart, FiPlay, FiTool, FiMusic, FiCamera,
  FiFlag, FiCompass, FiSearch, FiZap, FiGlobe, FiLayers, FiAward,
} from "react-icons/fi";
import {
  GiRat, GiBullHorns, GiTigerHead, GiRabbit, GiDragonHead, GiSnake,
  GiHorseHead, GiGoat, GiMonkey, GiRooster, GiSittingDog, GiPig,
} from "react-icons/gi";

// One distinct Unicode astrological glyph per sign.
export const ZODIAC_GLYPH: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

// One distinct vector icon per MBTI type, chosen to fit that type's
// archetype (e.g. INTJ "the Architect" -> a target/blueprint mark).
export const MBTI_ICON: Record<string, IconType> = {
  INTJ: FiTarget, INTP: FiCpu, ENTJ: FiTrendingUp, ENTP: FiEdit3,
  INFJ: FiEye, INFP: FiFeather, ENFJ: FiUsers, ENFP: FiSmile,
  ISTJ: FiCheckSquare, ISFJ: FiShield, ESTJ: FiBriefcase, ESFJ: FiHeart,
  ISTP: FiTool, ISFP: FiCamera, ESTP: FiPlay, ESFP: FiMusic,
};

// One distinct vector icon per Life Path number, including the 11/22/33
// master numbers.
export const LIFE_PATH_ICON: Record<number, IconType> = {
  1: FiFlag, 2: FiUsers, 3: FiFeather, 4: FiTool, 5: FiCompass, 6: FiHeart,
  7: FiSearch, 8: FiZap, 9: FiGlobe, 11: FiEye, 22: FiLayers, 33: FiAward,
};

// One distinct vector icon per Chinese zodiac animal.
export const CHINESE_ICON: Record<string, IconType> = {
  Rat: GiRat, Ox: GiBullHorns, Tiger: GiTigerHead, Rabbit: GiRabbit, Dragon: GiDragonHead,
  Snake: GiSnake, Horse: GiHorseHead, Goat: GiGoat, Monkey: GiMonkey, Rooster: GiRooster,
  Dog: GiSittingDog, Pig: GiPig,
};

export function ZodiacGlyph({ sign }: { sign: string }) {
  return <>{ZODIAC_GLYPH[sign] || "✦"}</>;
}

export function MbtiIcon({ code, size = 14 }: { code: string; size?: number }) {
  const C = MBTI_ICON[code];
  return C ? <C size={size} /> : null;
}

export function LifePathIcon({ n, size = 14 }: { n: number; size?: number }) {
  const C = LIFE_PATH_ICON[n];
  return C ? <C size={size} /> : null;
}

export function ChineseZodiacIcon({ animal, size = 14 }: { animal: string; size?: number }) {
  const C = CHINESE_ICON[animal];
  return C ? <C size={size} /> : null;
}
