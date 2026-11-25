// 기존 mbus.co.kr(cafe24)의 포트폴리오·공지사항·FAQ를 읽어 scripts/legacy/out/ 에 매니페스트와 원본 이미지를 만든다.
// 읽기 전용이며 여러 번 실행해도 안전하다(이미 받은 이미지는 다시 받지 않는다). 가져오기는 import.mjs 가 한다.
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE, extractImageUrls, extractPostArea, fetchBuffer, fetchHtml, htmlToText, sleep } from './lib.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
const DELAY_MS = 150;

const BOARDS = {
  portfolio: { page: 'gallery/gallery1.php', id: 12 },
  notice: { page: 'customer/notice.php', id: 2 },
  faq: { page: 'customer/faq.php', id: 26 },
};

const CATEGORY_BY_LABEL = { 병원: 'HOSPITAL', 학원: 'ACADEMY', 'F&B': 'FNB', 기타: 'ETC' };

const listUrl = (board, page) => `${BASE}/${board.page}?com_board_page=${page}&com_board_id=${board.id}`;
const detailUrl = (board, idx) => `${BASE}/${board.page}?com_board_basic=read_form&com_board_idx=${idx}&com_board_id=${board.id}`;

const idsIn = (html) => [...new Set([...html.matchAll(/com_board_idx=(\d+)/g)].map((match) => Number(match[1])))];

/** 목록을 끝까지 넘기며 글 번호를 모은다. 새 번호가 없으면 마지막 페이지다. */
async function crawlList(board, parseRows) {
  const rows = new Map();
  for (let page = 1; page <= 50; page += 1) {
    const html = await fetchHtml(listUrl(board, page));
    const found = parseRows(html).filter((row) => !rows.has(row.idx));
    if (found.length === 0) break;
    found.forEach((row) => rows.set(row.idx, row));
    await sleep(DELAY_MS);
  }
  return [...rows.values()];
}

/** 상세의 정보 표(`board_bgcolor` 라벨 셀 + 값 셀)를 라벨 → 값 HTML 로 읽는다. */
function readInfoCells(html) {
  const cells = {};
  for (const match of html.matchAll(/<td[^>]*class=["']board_bgcolor["'][^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi)) {
    cells[htmlToText(match[1])] = match[2];
  }
  return cells;
}

async function downloadImage(url, relativePath) {
  const file = path.join(OUT, relativePath);
  const exists = await stat(file).then(() => true, () => false);
  if (!exists) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, await fetchBuffer(url));
    await sleep(DELAY_MS);
  }
  return relativePath;
}

const extensionOf = (url) => path.extname(new URL(url).pathname).toLowerCase() || '.jpg';

async function crawlPortfolios() {
  const board = BOARDS.portfolio;
  const ids = (await crawlList(board, (html) => idsIn(html).map((idx) => ({ idx })))).map((row) => row.idx).sort((a, b) => a - b);
  const items = [];
  for (const idx of ids) {
    const html = await fetchHtml(detailUrl(board, idx));
    const cells = readInfoCells(html);
    const postArea = extractPostArea(html);
    const [imageUrl] = extractImageUrls(postArea);
    const title = htmlToText(cells['제목'] ?? '');
    const categoryLabel = htmlToText(cells['분류'] ?? '');
    const description = htmlToText(postArea)
      .replace(/\s*\n\s*/g, ' ')
      .replace(/^[-\s]+/, '')
      .replace(/\s+([.,])/g, '$1')
      .slice(0, 500);
    const imageFile = imageUrl ? await downloadImage(imageUrl, `images/portfolio/${idx}${extensionOf(imageUrl)}`) : null;
    if (!title) console.warn(`  ! portfolio ${idx}: 제목을 읽지 못했습니다`);
    if (!imageFile) console.warn(`  ! portfolio ${idx}: 이미지가 없습니다`);
    if (!(categoryLabel in CATEGORY_BY_LABEL)) console.warn(`  ! portfolio ${idx}: 알 수 없는 분류 "${categoryLabel}" → 기타`);
    items.push({
      legacyIdx: idx,
      title,
      category: CATEGORY_BY_LABEL[categoryLabel] ?? 'ETC',
      description: description || null,
      imageFile,
    });
    console.log(`  portfolio ${idx} ${categoryLabel} ${title}`);
    await sleep(DELAY_MS);
  }
  return items;
}

function parseNoticeRows(html) {
  const rows = [];
  for (const match of html.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/gi)) {
    const block = match[0];
    const idx = /com_board_idx=(\d+)/.exec(block)?.[1];
    if (!idx) continue;
    const cells = [...block.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => htmlToText(cell[1]));
    const date = /(\d{4}-\d{2}-\d{2})/.exec(block)?.[1];
    rows.push({
      idx: Number(idx),
      pinned: cells[0] === '공지',
      title: cells[1],
      date,
      viewCount: Number(cells[cells.length - 1]) || 0,
    });
  }
  return rows;
}

async function crawlNotices() {
  const board = BOARDS.notice;
  const rows = (await crawlList(board, parseNoticeRows)).sort((a, b) => a.idx - b.idx);
  const items = [];
  // 같은 날 올린 글의 순서를 지키려고 그날 글들 안의 순번(글 번호 오름차순)을 09:00부터 분 단위로 더한다.
  const countByDate = new Map();
  for (const row of rows) {
    if (!row.date) {
      console.warn(`  ! notice ${row.idx}: 목록에서 날짜를 읽지 못해 건너뜁니다 (${row.title})`);
      continue;
    }
    const order = countByDate.get(row.date) ?? 0;
    countByDate.set(row.date, order + 1);
    const html = await fetchHtml(detailUrl(board, row.idx));
    const postArea = extractPostArea(html);
    const imageFiles = [];
    for (const [order, url] of extractImageUrls(postArea).entries()) {
      imageFiles.push(await downloadImage(url, `images/notice/${row.idx}-${order + 1}${extensionOf(url)}`));
    }
    const body = htmlToText(postArea) || row.title;
    const hour = String(9 + Math.floor(order / 60)).padStart(2, '0');
    const minute = String(order % 60).padStart(2, '0');
    const publishedAt = `${row.date}T${hour}:${minute}:00+09:00`;
    items.push({
      legacyIdx: row.idx,
      title: row.title,
      body,
      pinned: row.pinned,
      publishedAt,
      viewCount: row.viewCount,
      imageFiles,
    });
    console.log(`  notice ${row.idx} ${row.date} ${row.pinned ? '[고정] ' : ''}${row.title} (이미지 ${imageFiles.length}장)`);
    await sleep(DELAY_MS);
  }
  return items;
}

/** FAQ 글 하나에는 `Q1. 질문` 다음 줄부터 답변이 이어진다. 글 하나를 문답 단위로 나눈다. */
function splitFaq(text) {
  return text
    .split(/^\s*Q\s*\d+\s*[.)]\s*/m)
    .slice(1)
    .map((chunk) => {
      const [question, ...answer] = chunk.split('\n');
      return { question: question.trim(), answer: answer.join('\n').trim() };
    })
    .filter((faq) => faq.question && faq.answer);
}

async function crawlFaqs() {
  const board = BOARDS.faq;
  const rows = await crawlList(board, (html) => {
    const rowsInPage = [];
    for (const match of html.matchAll(/<a[^>]*com_board_idx=(\d+)[^>]*>([\s\S]*?)<\/a>/gi)) {
      const title = htmlToText(match[2]);
      if (title) rowsInPage.push({ idx: Number(match[1]), title });
    }
    return rowsInPage;
  });
  const faqs = [];
  for (const row of rows) {
    const category = row.title.includes('병원') ? 'HOSPITAL' : 'MEDIA';
    const html = await fetchHtml(detailUrl(board, row.idx));
    const pairs = splitFaq(htmlToText(extractPostArea(html)));
    if (pairs.length === 0) console.warn(`  ! faq ${row.idx}: 문답을 찾지 못했습니다 (${row.title})`);
    pairs.forEach((pair) => faqs.push({ category, ...pair }));
    console.log(`  faq ${row.idx} ${row.title} → 문답 ${pairs.length}개`);
    await sleep(DELAY_MS);
  }
  return faqs;
}

console.log('포트폴리오');
const portfolios = await crawlPortfolios();
console.log('공지사항');
const notices = await crawlNotices();
console.log('FAQ');
const faqs = await crawlFaqs();

await mkdir(OUT, { recursive: true });
const manifest = { source: BASE, crawledAt: new Date().toISOString(), portfolios, notices, faqs };
await writeFile(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\n완료: 포트폴리오 ${portfolios.length}건, 공지 ${notices.length}건, FAQ ${faqs.length}건 → ${path.join(OUT, 'manifest.json')}`);
