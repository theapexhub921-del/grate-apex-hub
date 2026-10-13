// POST /api/chat  (Authorization: Bearer <the learner's Firebase ID token>)
//
//   { message, history?: [{ role: 'user' | 'model', text }] }  ->  { answer, provider }
//
// The general "Study chat": not tied to a lesson, so it never touches the
// lesson-AI quota in api/ai.mjs. It has its own, larger per-learner allowance
// and its own provider, so heavy lesson use and heavy chat use cannot starve
// each other.
//
// Providers are tried in this order; a provider that is missing or fails with
// a limit / outage error just hands over to the next one:
//   1. Any OpenAI-compatible service (Groq, OpenRouter, OpenAI, Together…):
//        CHAT_API_KEY   the key
//        CHAT_API_BASE  default https://api.groq.com/openai/v1
//        CHAT_MODEL     default llama-3.3-70b-versatile
//   2. Gemini (the same GEMINI_API_KEY as api/ai.mjs):
//        GEMINI_CHAT_MODEL  default gemini-3.1-flash-lite
// Set whichever you have; at least one key is needed. Keys live in Vercel's
// environment variables and never reach the app.
import { createRemoteJWKSet, jwtVerify } from 'jose';

const PROJECT = 'grate-apex';
const KEYS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

const MAX_MESSAGE_CHARS = 4_000;
const MAX_HISTORY = 20;
const MAX_TURN_CHARS = 4_000;
const WINDOW_MS = 10 * 60_000;
const MAX_REQUESTS = 120;

const recent = new Map();
function limited(uid) {
  const now = Date.now();
  const hits = (recent.get(uid) ?? []).filter((at) => now - at < WINDOW_MS);
  if (hits.length >= MAX_REQUESTS) {
    recent.set(uid, hits);
    return true;
  }
  hits.push(now);
  recent.set(uid, hits);
  if (recent.size > 5000) for (const [key, list] of recent) if (!list.some((at) => now - at < WINDOW_MS)) recent.delete(key);
  return false;
}

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const RULES = [
  'You are the Study Chat assistant inside GrAte Apex Hub, an app for KNUST Level 100 Medical Sciences students in Ghana.',
  'Help with anything a student might need: explaining concepts (anatomy, physiology, biochemistry, chemistry, biology, maths, computing, behavioural science), study plans, exam technique, memory tricks, writing, and general questions.',
  'Be clear and friendly for a beginner. Use short paragraphs or short lists, plain words, and define jargon. Format replies with Markdown where it helps: short ## headings, bullet or numbered lists, **bold** for key terms, tables for comparisons, and fenced code blocks for code. Write maths and formulas in LaTeX: $...$ inside a sentence, and $$...$$ on its own line for a displayed formula. Chemical formulas can be written as plain text, such as H2O or CO2.',
  'Never invent facts, numbers, drug doses or citations. If you are not sure, say so, and tell the learner to check lecture notes or a textbook for anything they will be examined on.',
  'You are not a doctor. For personal health problems, give general information and suggest seeing a clinician.',
].join('\n');

class ProviderError extends Error {
  constructor(kind, status) {
    super(kind);
    this.kind = kind; // 'busy' | 'blocked' | 'upstream'
    this.status = status;
  }
}

async function openAiCompatible(messages) {
  const key = process.env.CHAT_API_KEY;
  if (!key) return null;
  const base = (process.env.CHAT_API_BASE || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
  const model = process.env.CHAT_MODEL || 'llama-3.3-70b-versatile';
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.6 }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('Chat provider error', response.status, detail.slice(0, 500));
    throw new ProviderError(response.status === 429 ? 'busy' : 'upstream', response.status);
  }
  const data = await response.json();
  const output = String(data?.choices?.[0]?.message?.content ?? '').trim();
  if (!output) throw new ProviderError('upstream', 200);
  return output;
}

async function gemini(messages) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_CHAT_MODEL || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const contents = [];
  for (const turn of messages.filter((m) => m.role !== 'system')) {
    const role = turn.role === 'assistant' ? 'model' : 'user';
    if (contents.length && contents[contents.length - 1].role === role) contents[contents.length - 1].parts[0].text += `\n${turn.content}`;
    else contents.push({ role, parts: [{ text: turn.content }] });
  }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: RULES }] }, contents, generationConfig: { maxOutputTokens: 4096 } }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('Gemini chat error', response.status, detail.slice(0, 500));
    throw new ProviderError(response.status === 429 ? 'busy' : 'upstream', response.status);
  }
  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const output = (candidate?.content?.parts ?? []).filter((part) => !part.thought && typeof part.text === 'string').map((part) => part.text).join('').trim();
  if (!output) throw new ProviderError(data?.promptFeedback?.blockReason || candidate?.finishReason === 'SAFETY' ? 'blocked' : 'upstream', 200);
  return output;
}

const PROVIDERS = [
  ['primary', openAiCompatible],
  ['gemini', gemini],
];

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  if (!process.env.CHAT_API_KEY && !process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'Study chat is not set up yet.', code: 'not-configured' });

  const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  let uid;
  try {
    const { payload } = await jwtVerify(token, KEYS, { issuer: `https://securetoken.google.com/${PROJECT}`, audience: PROJECT });
    uid = payload.sub;
  } catch {
    return res.status(401).json({ error: 'Please sign in again.', code: 'auth' });
  }
  if (!uid) return res.status(401).json({ error: 'Please sign in again.', code: 'auth' });
  if (limited(uid)) return res.status(429).json({ error: 'You are going quickly. Wait a few minutes and try again.', code: 'rate' });

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
  const message = text(body?.message, MAX_MESSAGE_CHARS);
  if (!message) return res.status(400).json({ error: 'Type a message first.', code: 'no-message' });

  const history = (Array.isArray(body?.history) ? body.history : [])
    .slice(-MAX_HISTORY)
    .map((turn) => ({ role: turn?.role === 'model' ? 'assistant' : 'user', content: text(turn?.text, MAX_TURN_CHARS) }))
    .filter((turn) => turn.content);
  while (history.length && history[0].role !== 'user') history.shift();
  const messages = [{ role: 'system', content: RULES }, ...history, { role: 'user', content: message }];

  let last = 'upstream';
  for (const [name, run] of PROVIDERS) {
    try {
      const answer = await run(messages);
      if (answer) return res.status(200).json({ answer, provider: name });
    } catch (problem) {
      last = problem instanceof ProviderError ? problem.kind : 'upstream';
    }
  }
  if (last === 'busy') return res.status(503).json({ error: 'The AI is busy right now. Try again in a moment.', code: 'busy' });
  if (last === 'blocked') return res.status(422).json({ error: 'The AI could not answer that. Try rewording your message.', code: 'blocked' });
  return res.status(502).json({ error: 'The AI could not answer right now. Please try again.', code: 'upstream' });
}

function safeJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
