import * as assert from 'assert';
import { basename } from 'path';
import { Bookmark } from '../../bookmark';

suite(`Suite: ${basename(__filename)}`, () => {
  let restorables: Array<{ restore: () => void }>;

  setup(() => {
    restorables = [];
  });

  teardown(() => {
    restorables.forEach((r) => r.restore());
  });

  test('basic props', () => {
    const expectedKind = 'workspace';
    const expectedName = '/workspace/test.txt';
    const expectedUri = `file://${expectedName}`;

    const bookmarkGroup = new Bookmark(expectedUri, expectedKind);
    assert.strictEqual(bookmarkGroup.kind, expectedKind);
    assert.strictEqual(bookmarkGroup.lineNumber, undefined);
    assert.strictEqual(bookmarkGroup.name, expectedName);
    assert.strictEqual(bookmarkGroup.uri.toString(), expectedUri);
  });

  test('basic props (with line-number)', () => {
    const expectedKind = 'global';
    const expectedLineNumber = 6;
    const name = '/workspace/test.txt';
    const expectedUri = `file://${name}#L${expectedLineNumber}`;
    const expectedName = `${name}:${expectedLineNumber}`;

    const bookmarkGroup = new Bookmark(expectedUri, expectedKind);
    assert.strictEqual(bookmarkGroup.kind, expectedKind);
    assert.strictEqual(bookmarkGroup.lineNumber, expectedLineNumber);
    assert.strictEqual(bookmarkGroup.name, expectedName);
    assert.strictEqual(bookmarkGroup.uri.toString(), expectedUri);
  });
});