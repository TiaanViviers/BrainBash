const API_BASE = 'https://opentdb.com';
let token = null;

const DEFAULT_DIFFICULTIES = ['easy', 'medium', 'hard'];
const DEFAULT_PER_DIFFICULTY = 7;
const CANONICAL_TO_OTDB = {
  'General Knowledge': 9,
  'Science': 17,
  'Entertainment': 11,
  'Geography': 22,
  'Sports': 21,
  'History': 23
};

export async function generateSeedBatch({
  categories = Object.keys(CANONICAL_TO_OTDB),
  difficulties = DEFAULT_DIFFICULTIES,
  perDifficulty = DEFAULT_PER_DIFFICULTY,
  rateLimitMs = 5500
} = {}) {
  const all = [];

  for (const canonical of categories) {
    const categoryId = CANONICAL_TO_OTDB[canonical];
    if (!categoryId) continue;

    const want = Math.min(50, perDifficulty * difficulties.length);
    const mediumBatch = await getQuestions({
      amount: want,
      categoryId,
      difficulty: 'medium',
      type: 'multiple'
    });

    const balanced = assignSyntheticDifficulties(mediumBatch, difficulties, perDifficulty);
    all.push(...balanced);

    if (rateLimitMs > 0) await sleep(rateLimitMs);
  }

  // De-duplicate by content hash (first-wins)
  const seen = new Set();
  const unique = [];
  for (const q of all) {
    if (seen.has(q.content_hash)) continue;
    seen.add(q.content_hash);
    unique.push(q);
  }
  return unique;
}

/**
 * Evenly assign synthetic difficulties across items.
 * - Keeps at most `perDifficulty` per difficulty label, round-robin.
 * - If fewer items returned, still distributes fairly.
 * - Marks items with difficulty_source = 'synthetic'.
 */
function assignSyntheticDifficulties(items, difficulties, perDifficulty) {
  const shuffled = shuffleArray(items);
  const buckets = {};
  for (const d of difficulties) buckets[d] = [];

  let i = 0;
  for (const item of shuffled) {
    // Find next bucket with capacity
    let tries = 0;
    while (tries < difficulties.length &&
           buckets[difficulties[i % difficulties.length]].length >= perDifficulty) {
      i++; tries++;
    }
    const d = difficulties[i % difficulties.length];
    buckets[d].push({
      ...item,
      difficulty: d,
      difficulty_source: 'synthetic'
    });
    i++;
  }

  // Flatten back to a single list
  return difficulties.flatMap(d => buckets[d]);
}

/**
 * Fetches a batch of questions from OpenTDB and returns normalized records.
 * Options (all optional):
 *   - amount      number (default 10, max 50 per request)
 *   - categoryId  number (OpenTDB category id)
 *   - difficulty  'easy' | 'medium' | 'hard'
 *   - type        'multiple' | 'boolean'  (we’ll default to 'multiple')
 */
export async function getQuestions(options = {}) {
  await ensureToken();

  // build query params from options
  const params = buildQueryParams(options);

  // build full request URL and call API
  let url = buildRequestUrl(params, token);
  let raw = await fetchJson(url);

  // if token exhausted (4) or token not found (3), refresh once and retry
  if (raw?.response_code === 4 || raw?.response_code === 3) {
    await requestNewToken();
    url = buildRequestUrl(params, token);
    raw = await fetchJson(url);
  }

  // validate
  validateApiResponse(raw);

  // transform raw items to normalized records
  const records = raw.results
    .filter(onlyWantedTypes(options))
    .map(transformItemToRecord)
    .map(addContentHash);

  return records;
}

/**
 * Request a fresh OpenTDB session token.
 * Token helps avoid duplicates across requests.
 * Throws if the HTTP request fails or OpenTDB returns an error.
 */
async function requestNewToken() {
  const url = `${API_BASE}/api_token.php?command=request`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Token HTTP error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (data.response_code !== 0 || !data.token) {
    throw new Error(`Token request failed: ${JSON.stringify(data)}`);
  }
  token = data.token;
}

/**
 * Ensure we have a valid token in memory.
 * Lazily requests one the first time it’s needed.
 */
async function ensureToken() {
  if (token === null) {
    await requestNewToken();
  }
  return token;
}

/** Convert caller options → URLSearchParams (without token). */
function buildQueryParams({ amount = 10, categoryId, difficulty, type = 'multiple' } = {}) {
  let n = Number(amount);
  if (!Number.isFinite(n)) n = 10;
  if (n < 1) n = 1;
  if (n > 50) n = 50;

  const params = new URLSearchParams();
  params.set('amount', String(n));
  params.set('encode', 'url3986');
  params.set('type', type);
  if (categoryId) params.set('category', String(categoryId));
  if (difficulty) params.set('difficulty', difficulty);
  return params;
}

/** Append token and produce the final request URL. */
function buildRequestUrl(params, currentToken) {
  const q = new URLSearchParams(params);
  if (currentToken) q.set('token', currentToken);
  return `${API_BASE}/api.php?${q.toString()}`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Thin fetch wrapper that returns JSON */
async function fetchJson(url, { retries = 3, baseDelayMs = 2000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url);

    // rate limit
    if (res.status === 429 && attempt < retries) {
      const retryAfter = res.headers.get('retry-after');
      const wait = retryAfter
        ? Math.max(0, Number(retryAfter) * 1000)
        : baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 1000);
      console.log(`Rate limited by OpenTDB, waiting ${Math.round(wait/1000)}s before retry ${attempt + 1}/${retries}`);
      await sleep(wait);
      continue;
    }

    // transient server errors
    if (res.status >= 500 && res.status <= 599 && attempt < retries) {
      await sleep(baseDelayMs * Math.pow(2, attempt));
      continue;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return res.json();
  }
  throw new Error('Failed after retries');
}

/** Throw on non-OK response_code. */
function validateApiResponse(data) {
  if (typeof data?.response_code !== 'number') {
    throw new Error('Malformed OpenTDB response.');
  }
  if (data.response_code !== 0) {
    throw new Error(`OpenTDB error: code=${data.response_code}`);
  }
}

/** Keep only the wanted question types (defaults to 'multiple'). */
function onlyWantedTypes({ type = 'multiple' } = {}) {
  return (item) => item.type === type;
}

/** Transform a raw OpenTDB item → normalized record we can store. */
function transformItemToRecord(item) {
  const question = normalizeText(decodeUrlEntities(item.question));
  const correct  = normalizeText(decodeUrlEntities(item.correct_answer));
  const options  = shuffleArray(
    [correct, ...(item.incorrect_answers || []).map(a => normalizeText(decodeUrlEntities(a)))]
  );

  return {
    source: 'opentdb',
    category_name: mapCategoryName(item.category),
    difficulty: item.difficulty,
    question,
    correct,
    options
  };
}

/** Attach a stable content_hash for DB de-duplication. */
function addContentHash(record) {
  return { ...record, content_hash: computeContentHash(record) };
}

/** Decode the url3986 encoding we requested. */
function decodeUrlEntities(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Normalize whitespace/quotes; keep it simple and readable. */
function normalizeText(s = '') {
  return String(s)
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

/** Fisher–Yates shuffle for answers (pure, in-place safe via copy). */
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Map provider category strings to 6 canonical buckets. */
function mapCategoryName(name = '') {
  const n = name.toLowerCase();
  if (n.includes('general')) return 'General Knowledge';
  if (n.includes('science')) return 'Science';
  if (n.includes('entertainment') || n.includes('film') || n.includes('music') ||
      n.includes('television') || n.includes('video game') || n.includes('book')) {
    return 'Entertainment';
  }
  if (n.includes('geography')) return 'Geography';
  if (n.includes('sport')) return 'Sports';
  if (n.includes('history')) return 'History';
  return name;
}

/** Compute a deterministic hash from question + correct + sorted options. */
function computeContentHash({ question, correct, options }) {
  // Placeholder — we’ll wire in Node's crypto in the next step.
  // For now, a readable stub that clearly shows intent:
  const payload = `${question}||${correct}||${[...options].sort().join('||')}`;
  // TODO: replace with real sha256(payload) for DB uniqueness
  return `hash:${simpleStringHash(payload)}`;
}

/** Tiny non-cryptographic hash as a temporary placeholder. */
function simpleStringHash(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}
