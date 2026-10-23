// SMS length rules, shared by the web pages and the API functions.
//
// A text that only uses the GSM-7 alphabet fits 160 characters in one SMS
// (153 per part once it is split). A single character outside it, such as
// á, a curly quote or any non-Latin script, switches the whole text to
// Unicode: 70 characters in one SMS, 67 per part.

const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
// These count as two characters each.
const GSM_EXTENDED = "^{}\\[~]|€\f";

export function smsInfo(text) {
  let gsmLength = 0;
  const unicodeChars = new Set();
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) gsmLength += 1;
    else if (GSM_EXTENDED.includes(ch)) gsmLength += 2;
    else unicodeChars.add(ch);
  }

  if (unicodeChars.size) {
    const length = text.length; // UTF-16 code units, which is what gets sent
    return {
      encoding: "Unicode",
      length,
      segments: length <= 70 ? 1 : Math.ceil(length / 67),
      unicodeChars: [...unicodeChars],
    };
  }
  return {
    encoding: "GSM-7",
    length: gsmLength,
    segments: gsmLength <= 160 ? 1 : Math.ceil(gsmLength / 153),
    unicodeChars: [],
  };
}

export function isGsm(text) {
  return smsInfo(text).encoding === "GSM-7";
}
