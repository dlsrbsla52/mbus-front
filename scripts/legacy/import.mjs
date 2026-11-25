// crawl.mjs 가 만든 scripts/legacy/out/manifest.json 을 관리자 API 로 가져온다.
// 이미지는 WebP 로 줄여(원본 1600px, 썸네일 600px) 업로드 URL 로 올린 뒤 등록한다.
//
// 사용: ADMIN_LOGIN_ID=... node scripts/legacy/import.mjs [--only=portfolio,notice,faq] [--limit=N] [--dry-run] [--allow-remote]
//   API_BASE_URL(기본 http://localhost:8080). 비밀번호는 인자로 받지 않는다.
//   터미널에서 실행하면 비밀번호를 화면에 보이지 않게 물어본다(셸 히스토리에 남지 않는다).
//   터미널이 없는 환경(CI 등)에서만 ADMIN_PASSWORD 환경변수를 쓴다.
//   원격 서버(--allow-remote)는 https:// 주소만 허용한다.
//   포트폴리오·공지는 legacyIdx 로 이미 가져온 항목을 건너뛰고, FAQ 는 질문이 같으면 건너뛴다(다시 실행해도 안전).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
const API = (process.env.API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const dryRun = flag('dry-run');
const only = new Set((option('only') ?? 'portfolio,notice,faq').split(','));
const limit = Number(option('limit') ?? Infinity);

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API);
if (!isLocal) {
  if (!flag('allow-remote')) {
    fail(`API_BASE_URL(${API})이 로컬이 아닙니다. 운영 등 원격 서버에 넣으려면 --allow-remote 를 붙이세요.`);
  }
  if (!API.startsWith('https://')) {
    fail(`API_BASE_URL(${API})은 https:// 주소여야 합니다. 관리자 비밀번호와 토큰이 평문으로 전송되는 것을 막습니다.`);
  }
}

/** 입력을 화면에 보이지 않게 한 줄 받는다. 터미널(TTY)에서만 호출한다. */
function promptHidden(question) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const finish = (fn, arg) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
      fn(arg);
    };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n' || ch === '\u0004') return finish(resolve, value);
        if (ch === '\u0003') return finish(reject, new Error('입력이 취소되었습니다.'));
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

let token = null;

/** 응답 봉투(`{ code, message, data }`)를 풀어 data 를 돌려준다. 성공 코드가 아니면 예외. */
async function api(method, url, body) {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!json || json.code !== '00000') {
    throw new Error(`${method} ${url} → ${res.status} ${json?.code ?? ''} ${json?.message ?? ''}`.trim());
  }
  return json.data;
}

async function login() {
  const { ADMIN_LOGIN_ID: loginId } = process.env;
  if (!loginId) fail('ADMIN_LOGIN_ID 환경변수가 필요합니다. (관리자 계정, 포트폴리오·공지·FAQ 관리 권한)');
  let password = process.env.ADMIN_PASSWORD;
  if (!password && process.stdin.isTTY) password = await promptHidden(`${loginId} 비밀번호: `).catch((error) => fail(error.message));
  if (!password) fail('비밀번호를 입력받을 수 없습니다. 터미널에서 실행하거나 ADMIN_PASSWORD 환경변수를 지정하세요.');
  token = (await api('POST', '/api/v1/auth/admin/login', { loginId, password })).accessToken;
}

let sharpModule = null;
async function toWebp(buffer, maxEdge, quality) {
  sharpModule ??= (await import('sharp').catch(() => fail('sharp 를 불러오지 못했습니다. npm ci 로 의존성을 설치했는지 확인하세요.'))).default;
  return sharpModule(buffer)
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
}

/** 업로드 URL 을 받아 저장소에 PUT 하고 객체 키를 돌려준다. */
async function upload(buffer, purpose, thumbnail) {
  const ticket = await api('POST', '/api/v1/admin/content/images/upload-url', {
    purpose,
    contentType: 'image/webp',
    contentLength: buffer.length,
    thumbnail,
  });
  const res = await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.headers, body: buffer });
  if (!res.ok) throw new Error(`저장소 업로드 실패: ${res.status}`);
  return ticket.key;
}

async function allPages(url) {
  const items = [];
  for (let page = 0; ; page += 1) {
    const result = await api('GET', `${url}${url.includes('?') ? '&' : '?'}page=${page}&size=100`);
    items.push(...result.items);
    if ((page + 1) * result.pageRows >= result.totalCnt) return items;
  }
}

const counts = { created: 0, skipped: 0, failed: 0 };
const tally = (kind, label, detail = '') => {
  counts[kind] += 1;
  const mark = { created: '+', skipped: '=', failed: '✗' }[kind];
  console.log(`  ${mark} ${label}${detail ? ` ${detail}` : ''}`);
};

async function importPortfolios(items) {
  const existing = new Set((await allPages('/api/v1/admin/content/portfolio')).map((p) => p.legacyIdx));
  // 오래된 글부터 넣어야 최신 글이 목록 맨 앞(큰 정렬 순서)에 온다.
  for (const item of items.slice(0, limit)) {
    const label = `portfolio ${item.legacyIdx} ${item.title}`;
    if (existing.has(item.legacyIdx)) {
      tally('skipped', label);
      continue;
    }
    if (!item.imageFile) {
      tally('failed', label, '이미지 없음');
      continue;
    }
    if (dryRun) {
      tally('created', label, '(dry-run)');
      continue;
    }
    try {
      const source = await readFile(path.join(OUT, item.imageFile));
      const imageKey = await upload(await toWebp(source, 1600, 82), 'PORTFOLIO', false);
      const thumbnailKey = await upload(await toWebp(source, 600, 78), 'PORTFOLIO', true);
      await api('POST', '/api/v1/admin/content/portfolio', {
        title: item.title,
        category: item.category,
        description: item.description,
        imageKey,
        thumbnailKey,
        visible: true,
        legacyIdx: item.legacyIdx,
      });
      tally('created', label);
    } catch (error) {
      tally('failed', label, error.message);
    }
  }
}

async function importNotices(items) {
  // 공지 목록에는 legacyIdx 가 없어 상세를 읽어 이미 가져온 글을 찾는다(글 수가 적다).
  const summaries = await allPages('/api/v1/admin/content/notice');
  const existing = new Set();
  for (const summary of summaries) existing.add((await api('GET', `/api/v1/admin/content/notice/${summary.id}`)).legacyIdx);

  for (const item of items.slice(0, limit)) {
    const label = `notice ${item.legacyIdx} ${item.title}`;
    if (existing.has(item.legacyIdx)) {
      tally('skipped', label);
      continue;
    }
    if (dryRun) {
      tally('created', label, `(dry-run, 이미지 ${item.imageFiles.length}장)`);
      continue;
    }
    try {
      const imageKeys = [];
      for (const file of item.imageFiles) {
        const source = await readFile(path.join(OUT, file));
        imageKeys.push(await upload(await toWebp(source, 1600, 82), 'NOTICE', false));
      }
      await api('POST', '/api/v1/admin/content/notice', {
        title: item.title,
        body: item.body,
        pinned: item.pinned,
        visible: true,
        publishedAt: item.publishedAt,
        imageKeys,
        legacyIdx: item.legacyIdx,
        legacyViewCount: item.viewCount,
      });
      tally('created', label, `(이미지 ${imageKeys.length}장)`);
    } catch (error) {
      tally('failed', label, error.message);
    }
  }
}

async function importFaqs(items) {
  const existing = new Set((await api('GET', '/api/v1/admin/content/faq')).map((faq) => faq.question));
  for (const item of items.slice(0, limit)) {
    const label = `faq ${item.category} ${item.question}`;
    if (existing.has(item.question)) {
      tally('skipped', label);
      continue;
    }
    if (dryRun) {
      tally('created', label, '(dry-run)');
      continue;
    }
    try {
      await api('POST', '/api/v1/admin/content/faq', { category: item.category, question: item.question, answer: item.answer, visible: true });
      tally('created', label);
    } catch (error) {
      tally('failed', label, error.message);
    }
  }
}

const manifest = JSON.parse(await readFile(path.join(OUT, 'manifest.json'), 'utf8').catch(() => fail('manifest.json 이 없습니다. 먼저 node scripts/legacy/crawl.mjs 를 실행하세요.')));
console.log(`대상 서버: ${API}${dryRun ? ' (dry-run: 업로드·등록 없이 계획만 출력)' : ''}`);
await login();

if (only.has('portfolio')) {
  console.log(`포트폴리오 ${manifest.portfolios.length}건`);
  await importPortfolios(manifest.portfolios);
}
if (only.has('notice')) {
  console.log(`공지사항 ${manifest.notices.length}건`);
  await importNotices(manifest.notices);
}
if (only.has('faq')) {
  console.log(`FAQ ${manifest.faqs.length}건`);
  await importFaqs(manifest.faqs);
}

console.log(`\n완료: 등록 ${counts.created}, 건너뜀 ${counts.skipped}, 실패 ${counts.failed}`);
if (counts.failed > 0) process.exit(1);
