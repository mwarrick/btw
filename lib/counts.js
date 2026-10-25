// lib/counts.js
// Reading a baptism count out of a text (api/sms-inbound.js), for churches
// that have finished signing up:
//   "14", "1,234"                -> 14, 1234 (any script's digits)
//   "14 bautismos", "baptisms: 14", "we baptized 14 people" -> 14
//   "nove", "catorce", "twenty five", "treinta y cinco" -> 9, 14, 25, 35
// A text with a baptism word but no single number (e.g. "muchos bautismos!")
// is a count to ask for (mentionsBaptism). Anything else isn't a count.

const MAX = 100000;

// Number words in the languages most churches text in; others use digits.
const UNITS = {
  en: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"],
  es: ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciseis", "diecisiete", "dieciocho", "diecinueve", "veinte"],
  pt: ["zero", "um", "dois", "tres", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove", "vinte"],
  fr: ["zero", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf", "vingt"],
};
const TENS = {
  en: { thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100 },
  es: { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100 },
  pt: { trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100 },
  fr: { trente: 30, quarante: 40, cinquante: 50, soixante: 60, cent: 100 },
};
const EXTRA = { una: 1, uma: 1, une: 1, duas: 2, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29 };
const JOIN = new Set(["y", "e", "and", "et"]);
const WORDS = new Map(Object.entries(EXTRA));
for (const lang of Object.keys(UNITS)) {
  UNITS[lang].forEach((w, n) => { if (!WORDS.has(w)) WORDS.set(w, n); });
  for (const [w, n] of Object.entries(TENS[lang])) WORDS.set(w, n);
}

// Baptism words, by their start (Latin and Cyrillic scripts) or anywhere
// (scripts written without spaces).
const STEMS = ["baptis", "baptiz", "baptem", "bautis", "bautiz", "batis", "batiz", "крещ", "крест", "бапт", "बपतिस्म", "বাপ্তিস্ম", "بپتسم", "معمود", "تعميد", "عماد", "تعمد"];
const INSIDE = ["洗礼", "受洗", "浸礼"];

const plain = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tokens = (s) => plain(s).split(/[^\p{L}\p{N}-]+/u).filter(Boolean);

// A token of digits (any script; "1,234" and "1.234" too) as a number.
function digitValue(t) {
  if (!/^\p{Nd}[\p{Nd},.]*$/u.test(t)) return null;
  const digits = [...t].filter((c) => /\p{Nd}/u.test(c)).map((c) => {
    const code = c.codePointAt(0);
    // Each script's digits run 0-9 in a row: the value is the distance from its zero.
    let zero = code;
    while (zero > code - 9 && /\p{Nd}/u.test(String.fromCodePoint(zero - 1))) zero--;
    return code - zero;
  }).join("");
  return digits.length <= 6 ? Number(digits) : null;
}

export function mentionsBaptism(text) {
  const p = plain(text);
  return INSIDE.some((w) => p.includes(w)) || tokens(text).some((t) => STEMS.some((s) => t.startsWith(s)));
}

// The count in `text`, or null: a number on its own, or one number (in
// digits or words) with a baptism word. Two numbers ("14 at 10am") or none
// is not a count.
export function readCount(text) {
  const raw = String(text || "").trim().replace(/[.!。！]+$/u, "");
  if (!raw) return null;
  const alone = digitValue(raw.replace(/\s+/g, ""));
  if (alone !== null && /^[\p{Nd}\s,.]+$/u.test(raw)) return alone <= MAX ? alone : null;

  // Every run of digits, wherever it is ("10am", "今天14人"), and number words.
  const found = (raw.match(/\p{Nd}(?:[\p{Nd},.]*\p{Nd})?/gu) || []).map((d) => digitValue(d) ?? Infinity);
  const list = tokens(raw).filter((t) => !/\p{Nd}/u.test(t));
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    // "twenty five", "treinta y cinco", "vingt-cinq": tens and a unit.
    const parts = t.includes("-") && !WORDS.has(t) ? t.split("-") : [t];
    if (!parts.every((x) => WORDS.has(x))) continue;
    let n = parts.reduce((s, x) => s + WORDS.get(x), 0);
    let j = i;
    while (n % 10 === 0 && n >= 20 && n < 100) {
      const next = JOIN.has(list[j + 1]) ? j + 2 : j + 1;
      const u = WORDS.get(list[next]);
      if (u === undefined || u === 0 || u >= 10) break;
      n += u; j = next;
    }
    found.push(n); i = j;
  }
  if (found.length !== 1 || found[0] > MAX) return null;
  // A number word alone ("nove"), or a number with a baptism word.
  const words = list.filter((t) => !WORDS.has(t) && !JOIN.has(t) && !t.split("-").every((x) => WORDS.has(x)));
  const hasLetters = /\p{L}/u.test(raw.replace(/\p{Nd}/gu, ""));
  return (words.length === 0 && !(/\p{Nd}/u.test(raw) && hasLetters)) || mentionsBaptism(raw) ? found[0] : null;
}

// A count that looks wrong enough to confirm before saving: over 1,000, or
// more than ten times the last one (and more than 20 above it).
export function needsConfirming(count, previous) {
  if (count > 1000) return true;
  return previous != null && previous > 0 && count > previous * 10 && count - previous > 20;
}
