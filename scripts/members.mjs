// Issue a signed QURATOR member link (same format the private ledger issues).
// Usage: node scripts/members.mjs <private-jwk.json> <expiry YYYY-MM-DD> [orderIdHex8]
// The private key is NEVER stored in this repo. Prints the token and the member link.
import { webcrypto as c } from 'crypto';
import fs from 'fs';
const [keyPath, exp, idHex] = process.argv.slice(2);
if (!keyPath || !/^\d{4}-\d{2}-\d{2}$/.test(exp || '')) { console.error('usage: node scripts/members.mjs key.jwk.json YYYY-MM-DD [id]'); process.exit(1); }
const jwk = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
const key = await c.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
const days = Math.round((Date.parse(exp + 'T00:00:00Z') - Date.UTC(2026, 0, 1)) / 864e5);
const id = idHex ? Buffer.from(idHex, 'hex') : c.getRandomValues(new Uint8Array(4));
const payload = new Uint8Array([1, days >> 8, days & 255, ...id]);
const sig = new Uint8Array(await c.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, payload));
const token = Buffer.from([...payload, ...sig]).toString('base64url');
console.log(JSON.stringify({ id: Buffer.from(id).toString('hex'), exp, token, link: 'https://probe2928-crypto.github.io/qurator/#/m/' + token }));
