// The lines the game says. Each word has two: "where is it?" and "here it is!".
// Shared lines are said in every game. All are drafts until the parent approves them,
// and each is a clip the parent records in their own voice.

export const whereLine = w => `فين ${w.def}؟`;
export const hereLine = w => `${w.g === 'm' ? 'أهو' : 'أهي'} ${w.def}!`;

export const SHARED = [
  { key: 'blow',  text: 'انفخ!' },
  { key: 'pop',   text: 'فرقعها!' },
  { key: 'more',  text: 'كمان؟' },
  { key: 'what',  text: 'إيه ده؟' },
  { key: 'bravo', text: 'برافو!' },
];
export const sharedText = key => SHARED.find(s => s.key === key)?.text ?? '';

// Clip keys: "<wordId>:where", "<wordId>:here", "shared:<key>".
export const clipKey = (wordId, kind) => `${wordId}:${kind}`;
export const sharedKey = key => `shared:${key}`;
export function lineForKey(key, getWord) {
  const [a, b] = key.split(':');
  if (a === 'shared') return sharedText(b);
  const w = getWord(a);
  if (!w) return '';
  return b === 'where' ? whereLine(w) : hereLine(w);
}
