import { useMemo, useState } from 'react';
import { State, computeBracket, champion, encodeState, decodeState } from './bracket';

function defaultState(): State {
  return {
    names: ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi'],
    picks: {},
    title: 'Tournament',
  };
}

function readInitialState(): State {
  const params = new URLSearchParams(window.location.search);
  if ([...params.keys()].length === 0) return defaultState();
  return decodeState(params, defaultState());
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function App() {
  const [state, setState] = useState<State>(readInitialState);
  const [namesText, setNamesText] = useState(() => readInitialState().names.join('\n'));
  const [copied, setCopied] = useState(false);

  const rounds = useMemo(() => computeBracket(state.names, state.picks), [state.names, state.picks]);
  const winnerName = useMemo(() => champion(rounds), [rounds]);

  function applyNames() {
    const names = namesText.split('\n').map((n) => n.trim()).filter(Boolean);
    setState((s) => ({ ...s, names, picks: {} }));
  }

  function shuffleNames() {
    const names = shuffle(state.names);
    setNamesText(names.join('\n'));
    setState((s) => ({ ...s, names, picks: {} }));
  }

  function pickWinner(matchId: string, name: string) {
    setState((s) => {
      const newPicks = { ...s.picks, [matchId]: name };
      const roundNum = Number(matchId.match(/^r(\d+)-/)?.[1] ?? -1);
      for (const key of Object.keys(newPicks)) {
        const km = Number(key.match(/^r(\d+)-/)?.[1] ?? -1);
        if (km > roundNum) delete newPicks[key];
      }
      return { ...s, picks: newPicks };
    });
  }

  function resetPicks() {
    setState((s) => ({ ...s, picks: {} }));
  }

  async function shareLink() {
    const params = encodeState(state);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', `?${params.toString()}`);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="page">
      <h1>Tournament Bracket Generator</h1>
      <p className="lede">
        Paste a list of names, get a single-elimination bracket with automatic byes for
        non-power-of-two fields, and click through winners round by round.
      </p>

      <section className="panel">
        <h2>Tournament name</h2>
        <input
          className="title-input"
          value={state.title}
          onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
          placeholder="e.g. Office Ping Pong Championship"
        />
      </section>

      <section className="panel">
        <h2>Participants (one per line)</h2>
        <textarea
          className="names-input"
          rows={8}
          value={namesText}
          onChange={(e) => setNamesText(e.target.value)}
        />
        <div className="button-row">
          <button className="primary-btn" onClick={applyNames}>Generate bracket</button>
          <button className="secondary-btn" onClick={shuffleNames}>Shuffle seeding</button>
        </div>
        <p className="hint">
          {state.names.length} participant{state.names.length === 1 ? '' : 's'} in the current
          bracket. Fields that aren't a power of two get automatic byes for the top seeds.
        </p>
      </section>

      {rounds.length === 0 ? (
        <section className="result">
          <p className="verdict">Add at least 2 participants to generate a bracket.</p>
        </section>
      ) : (
        <>
          {winnerName && (
            <section className="result positive">
              <p className="verdict">🏆 Champion: <strong>{winnerName}</strong></p>
            </section>
          )}
          <section className="bracket-wrap">
            <div className="bracket">
              {rounds.map((round, ri) => (
                <div className="round-col" key={ri}>
                  <div className="round-title">{ri === rounds.length - 1 ? 'Final' : `Round ${ri + 1}`}</div>
                  {round.map((match) => (
                    <div className="match" key={match.id}>
                      <button
                        className={`slot ${match.winner === match.player1 && match.player1 !== null ? 'winner' : ''}`}
                        disabled={match.player1 === null || match.player2 === null}
                        onClick={() => match.player1 && pickWinner(match.id, match.player1)}
                      >
                        {match.player1 ?? <span className="tbd">TBD</span>}
                      </button>
                      <button
                        className={`slot ${match.winner === match.player2 && match.player2 !== null ? 'winner' : ''}`}
                        disabled={match.player1 === null || match.player2 === null}
                        onClick={() => match.player2 && pickWinner(match.id, match.player2)}
                      >
                        {match.player2 ?? <span className="tbd">TBD</span>}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
          <div className="actions">
            <button className="secondary-btn" onClick={resetPicks}>Reset picks</button>
            <button className="share-btn" onClick={shareLink}>{copied ? 'Copied!' : 'Copy share link'}</button>
          </div>
        </>
      )}

      <section className="explainer">
        <h2>How this works</h2>
        <p>
          Participants are seeded in the order you list them, paired from opposite ends of the
          field (1st vs. last, 2nd vs. second-last, and so on) so that when the field isn't a
          power of two, the top seeds are the ones who receive a first-round bye rather than
          anyone getting an unfair advantage at random. Click a name in any decided match to
          advance them; later-round picks are cleared automatically if you change an earlier one.
        </p>
        <h2>Frequently asked questions</h2>
        <h3>What happens with an odd number of participants?</h3>
        <p>
          The bracket size rounds up to the next power of two, and the extra slots become byes —
          automatic advances for the participants without an opponent in round 1.
        </p>
        <h3>Can I change a pick after making it?</h3>
        <p>Yes — click the other name in that match. Any picks in later rounds that depended on it are cleared automatically so the bracket never shows an inconsistent state.</p>
        <h3>Does the share link update live for people I send it to?</h3>
        <p>No — it's a snapshot of the bracket and picks at the moment you copy it. Copy a new link after making more picks.</p>
      </section>
    </main>
  );
}
