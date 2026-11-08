// One sitting: a few rounds of one game. Only the parent's Next moves on,
// and only after the word moment of the round is over.
export const ROUNDS = 6;

export const createSitting = (game, rounds = ROUNDS) => ({ game, rounds, index: 0, done: false, previous: null });
export const canNext = s => s.done;
export const finishRound = (s, wordId) => ({ ...s, done: true, previous: wordId });
export function advance(s) {
  if (!s.done) return s;
  return { ...s, index: s.index + 1, done: false };
}
export const isOver = s => s.index >= s.rounds;
