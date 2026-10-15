import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { diffLines } from './diff';

describe('diffLines', () => {
  it('marks a changed line as removed and added', () => {
    assert.deepEqual(diffLines('a\nb\nc', 'a\nB\nc'), [
      { kind: 'same', text: 'a' },
      { kind: 'remove', text: 'b' },
      { kind: 'add', text: 'B' },
      { kind: 'same', text: 'c' },
    ]);
  });

  it('keeps lines both sides share in the middle', () => {
    assert.deepEqual(
      diffLines('x\na\ny', 'a\nz').map((l) => l.kind),
      ['remove', 'same', 'remove', 'add'],
    );
  });

  it('reports no change for equal text', () => {
    assert.ok(diffLines('a\nb', 'a\nb').every((l) => l.kind === 'same'));
  });
});
