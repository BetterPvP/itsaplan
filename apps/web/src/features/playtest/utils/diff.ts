export type DiffLine = { kind: 'same' | 'add' | 'remove'; text: string };

const MAX_CELLS = 4_000_000;

// A line diff of `after` against `before`: the common head and tail are matched
// first, and the lines between them by longest common subsequence. A middle too
// large for that shows as removed and added in full.
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  )
    tail++;
  const midA = a.slice(head, a.length - tail);
  const midB = b.slice(head, b.length - tail);
  const same = (text: string): DiffLine => ({ kind: 'same', text });

  let middle: DiffLine[];
  if (midA.length * midB.length > MAX_CELLS) {
    middle = [
      ...midA.map((text): DiffLine => ({ kind: 'remove', text })),
      ...midB.map((text): DiffLine => ({ kind: 'add', text })),
    ];
  } else {
    const n = midA.length;
    const m = midB.length;
    const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        lcs[i][j] =
          midA[i] === midB[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    middle = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (midA[i] === midB[j]) {
        middle.push(same(midA[i]));
        i++;
        j++;
      } else if (lcs[i + 1][j] >= lcs[i][j + 1]) middle.push({ kind: 'remove', text: midA[i++] });
      else middle.push({ kind: 'add', text: midB[j++] });
    }
    while (i < n) middle.push({ kind: 'remove', text: midA[i++] });
    while (j < m) middle.push({ kind: 'add', text: midB[j++] });
  }
  return [...a.slice(0, head).map(same), ...middle, ...a.slice(a.length - tail).map(same)];
}
