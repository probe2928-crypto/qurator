/**
 * QURATOR billing worker (Cloudflare Workers + KV) — 토스페이먼츠 카드 자동결제
 *
 * POST /billing/confirm  {authKey, customerKey, name, email, plan}
 *      → 빌링키 발급 → 첫 달 결제 → 구독 저장 → { ok, code, next }
 * GET  /member/verify?code=QM-XXXX → { active }
 * POST /billing/cancel   {code}      → 다음 결제일부터 청구 중단
 * cron (매일)                        → 결제일이 된 구독 자동 청구
 *
 * Secrets / bindings (wrangler.toml):
 *   TOSS_SECRET_KEY  (secret, wrangler secret put TOSS_SECRET_KEY)
 *   ALLOW_ORIGIN     (var, e.g. https://probe2928-crypto.github.io)
 *   SUBS             (KV namespace)
 */
const PLANS = { daily: { amount: 30000, name: 'QURATOR Daily Art 월 구독' } };
const TOSS = 'https://api.tosspayments.com';

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(req.url);
    try {
      if (url.pathname === '/billing/confirm' && req.method === 'POST') return json(await confirm(await req.json(), env), cors);
      if (url.pathname === '/member/verify') return json(await verify(url.searchParams.get('code'), env), cors);
      if (url.pathname === '/billing/cancel' && req.method === 'POST') return json(await cancel(await req.json(), env), cors);
      return json({ error: 'not_found' }, cors, 404);
    } catch (e) {
      return json({ error: e.message || 'error' }, cors, 400);
    }
  },
  async scheduled(_evt, env, ctx) { ctx.waitUntil(renewDue(env)); }
};

const json = (d, h, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...h, 'Content-Type': 'application/json' } });
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); // KST

function addMonth(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d, last))).toISOString().slice(0, 10);
}

async function toss(env, path, body) {
  const r = await fetch(TOSS + path, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(env.TOSS_SECRET_KEY + ':'), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || d.code || 'toss_error');
  return d;
}

async function charge(env, sub) {
  const P = PLANS[sub.plan];
  const orderId = 'Q' + Date.now() + Math.random().toString(36).slice(2, 7);
  const pay = await toss(env, '/v1/billing/' + encodeURIComponent(sub.billingKey), {
    customerKey: sub.customerKey, amount: P.amount, orderId, orderName: P.name,
    customerEmail: sub.email, customerName: sub.name
  });
  sub.payments = [...(sub.payments || []).slice(-23), { orderId, paymentKey: pay.paymentKey, amount: P.amount, at: new Date().toISOString() }];
  return sub;
}

async function confirm({ authKey, customerKey, name, email, plan = 'daily' }, env) {
  if (!authKey || !customerKey) throw new Error('missing_params');
  if (!PLANS[plan]) throw new Error('bad_plan');
  const existing = await env.SUBS.get('sub:' + customerKey, 'json');
  if (existing) return { ok: true, code: existing.code, next: existing.next }; // refresh-safe
  const { billingKey } = await toss(env, '/v1/billing/authorizations/issue', { authKey, customerKey });
  let sub = { customerKey, billingKey, name, email, plan, status: 'active', start: today(), next: addMonth(today()), fails: 0 };
  sub = await charge(env, sub);
  sub.code = 'QM-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  await env.SUBS.put('sub:' + customerKey, JSON.stringify(sub));
  await env.SUBS.put('code:' + sub.code, customerKey);
  return { ok: true, code: sub.code, next: sub.next };
}

async function subByCode(code, env) {
  if (!code) return null;
  const ck = await env.SUBS.get('code:' + code.toUpperCase());
  return ck ? env.SUBS.get('sub:' + ck, 'json') : null;
}

async function verify(code, env) {
  const s = await subByCode(code, env);
  if (!s) return { active: false };
  const active = s.status === 'active' || (s.status === 'canceled' && s.next > today());
  return { active, status: s.status, next: s.next };
}

async function cancel({ code }, env) {
  const s = await subByCode(code, env);
  if (!s) throw new Error('not_found');
  s.status = 'canceled'; s.canceledAt = new Date().toISOString();
  await env.SUBS.put('sub:' + s.customerKey, JSON.stringify(s));
  return { ok: true, until: s.next };
}

async function renewDue(env) {
  let cursor;
  do {
    const list = await env.SUBS.list({ prefix: 'sub:', cursor });
    for (const k of list.keys) {
      const s = await env.SUBS.get(k.name, 'json');
      if (!s || s.next > today() || (s.status !== 'active' && s.status !== 'past_due')) continue;
      try {
        await charge(env, s);
        s.status = 'active'; s.fails = 0; s.next = addMonth(s.next);
      } catch (e) {
        s.fails = (s.fails || 0) + 1; s.lastError = e.message;
        s.status = s.fails >= 3 ? 'unpaid' : 'past_due'; // retried by the next daily cron, stops after 3 tries
      }
      await env.SUBS.put(k.name, JSON.stringify(s));
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
}
