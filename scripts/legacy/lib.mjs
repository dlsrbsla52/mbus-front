// 기존 mbus.co.kr(cafe24) 이관 스크립트 공용 도구
export const ORIGIN = 'https://www.mbus.co.kr';
export const BASE = `${ORIGIN}/default`;

const decoder = new TextDecoder('euc-kr');
const HEADERS = { 'user-agent': 'Mozilla/5.0 (mbus-migration)' };

/** 기존 사이트는 CP949(EUC-KR 확장)라 바이트로 받아 직접 디코딩한다. */
export async function fetchHtml(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return decoder.decode(await res.arrayBuffer());
}

export async function fetchBuffer(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const absoluteUrl = (src) => new URL(src, `${ORIGIN}/`).href;

const NAMED_ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isInteger(code) && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** 본문 HTML을 줄바꿈이 남는 텍스트로 바꾼다. 태그를 먼저 걷어낸 뒤 엔티티를 풀어야 `&lt;`가 태그로 오인되지 않는다. */
export function htmlToText(html) {
  const stripped = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(stripped)
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 게시판 상세의 본문 영역(`#post_area`) HTML. 본문은 첫 `</td>`에서 끝난다. */
export function extractPostArea(html) {
  const marker = html.indexOf('id="post_area"');
  if (marker < 0) return '';
  const start = html.indexOf('>', marker) + 1;
  const end = html.indexOf('</td>', start);
  return html.slice(start, end < 0 ? undefined : end).replace(/<\/div>\s*$/i, '');
}

export function extractImageUrls(html) {
  return [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((match) => absoluteUrl(decodeEntities(match[1])));
}
