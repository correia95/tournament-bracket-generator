export interface Match {
  id: string;
  player1: string | null;
  player2: string | null;
  winner: string | null;
}

export type Round = Match[];

export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  return 2 ** Math.ceil(Math.log2(n));
}

function seededFirstRoundPairs(names: string[], size: number): [string | null, string | null][] {
  const padded: (string | null)[] = [...names];
  while (padded.length < size) padded.push(null);
  const pairs: [string | null, string | null][] = [];
  for (let i = 0; i < size / 2; i++) {
    pairs.push([padded[i], padded[size - 1 - i]]);
  }
  return pairs;
}

export function computeBracket(names: string[], picks: Record<string, string>): Round[] {
  if (names.length < 2) return [];

  const size = nextPowerOfTwo(names.length);
  const rounds: Round[] = [];

  const firstPairs = seededFirstRoundPairs(names, size);
  let currentRound: Round = firstPairs.map(([p1, p2], i) => {
    const id = `r0-m${i}`;
    let winner: string | null = null;
    if (p1 !== null && p2 === null) winner = p1;
    else if (p1 === null && p2 !== null) winner = p2;
    else if (p1 !== null && p2 !== null) winner = picks[id] ?? null;
    return { id, player1: p1, player2: p2, winner };
  });
  rounds.push(currentRound);

  let roundIndex = 1;
  while (currentRound.length > 1) {
    const nextRound: Round = [];
    for (let i = 0; i < currentRound.length / 2; i++) {
      const p1 = currentRound[2 * i].winner;
      const p2 = currentRound[2 * i + 1].winner;
      const id = `r${roundIndex}-m${i}`;
      const winner: string | null = p1 !== null && p2 !== null ? (picks[id] ?? null) : null;
      nextRound.push({ id, player1: p1, player2: p2, winner });
    }
    rounds.push(nextRound);
    currentRound = nextRound;
    roundIndex++;
  }

  return rounds;
}

export function champion(rounds: Round[]): string | null {
  if (rounds.length === 0) return null;
  const finalRound = rounds[rounds.length - 1];
  if (finalRound.length !== 1) return null;
  return finalRound[0].winner;
}

export interface State {
  names: string[];
  picks: Record<string, string>;
  title: string;
}

function toUint8Array(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function toBase64Url(text: string): string {
  const bytes = toUint8Array(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeState(state: State): URLSearchParams {
  const params = new URLSearchParams();
  params.set('d', toBase64Url(JSON.stringify(state)));
  return params;
}

export function decodeState(params: URLSearchParams, fallback: State): State {
  const raw = params.get('d');
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(fromBase64Url(raw));
    if (
      typeof parsed !== 'object' || parsed === null ||
      !Array.isArray(parsed.names) ||
      typeof parsed.picks !== 'object' || parsed.picks === null
    ) {
      return fallback;
    }
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}
