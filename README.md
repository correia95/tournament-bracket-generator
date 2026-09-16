# Tournament Bracket Generator

Paste a list of names, get a single-elimination bracket with automatic
byes for non-power-of-two fields, and click through winners round by
round.

- Seeds pairs from opposite ends of the field (1st vs. last, 2nd vs.
  second-last, ...) so byes land on the top seeds when the field isn't
  a power of two
- Click a name to advance it; changing an earlier pick automatically
  clears any later-round picks that depended on it, so the bracket
  never shows an inconsistent state
- Shuffle seeding for a random draw
- Shareable link is a real state-restoring snapshot (base64url-encoded,
  unicode-safe) — this is user-created content, not a spoiler-sensitive
  daily puzzle, so the full bracket and picks round-trip through it

## Develop

```
npm install
npm run dev
npm run build      # tsc --noEmit && vite build
node --experimental-strip-types --test src/bracket.test.mjs
```

The engine (`computeBracket`, `champion`, `nextPowerOfTwo`) is in
`src/bracket.ts`. 10 Node tests in `src/bracket.test.mjs`, including
hand-traced bye placement and multi-round pick-feeding scenarios.

## Deploy

Static assets on Cloudflare Workers (`wrangler.jsonc`). Live at
<https://tournament-bracket-generator.correia95.workers.dev/>.
