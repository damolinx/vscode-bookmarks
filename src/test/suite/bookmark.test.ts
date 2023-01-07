import * as assert from 'assert';
import { basename, normalize } from 'path';
import { Uri } from 'vscode';
import { Bookmark, DEFAULT_LINE_NUMBER } from '../../bookmark';

suite(`Suite: ${basename(__filename, '.test.js')}`, () => {
  let restorables: Array<{ restore: () => void }>;

  setup(() => {
    restorables = [];
  });

  teardown(() => restorables.forEach((r) => r.restore()));

  test('basic props', () => {
    const expectedKind = 'workspace';
    const expectedPath = '/workspace/test.txt';
    const expectedUri = `file://${expectedPath}`;

    const bookmark = new Bookmark(expectedUri, expectedKind);

    assert.strictEqual(bookmark.kind, expectedKind);
    assert.strictEqual(bookmark.lineNumber, DEFAULT_LINE_NUMBER);
    assert.strictEqual(bookmark.name, normalize(expectedPath));
    assert.strictEqual(bookmark.uri.toString(), expectedUri);
  });

  test('basic props (with line-number)', () => {
    const expectedKind = 'global';
    const expectedLineNumber = 6;
    const expectedPath = '/workspace/test.txt';
    const expectedUri = `file://${expectedPath}#L${expectedLineNumber}`;
    const expectedName = `${expectedPath}:${expectedLineNumber}`;

    const bookmark = new Bookmark(expectedUri, expectedKind);

    assert.strictEqual(bookmark.kind, expectedKind);
    assert.strictEqual(bookmark.lineNumber, expectedLineNumber);
    assert.strictEqual(bookmark.name, normalize(expectedName));
    assert.strictEqual(bookmark.uri.toString(), expectedUri);
  });

  test('matchesUri', () => {
    const expectedLineNumber = 6;
    const expectedPath = '/workspace/test.txt';
    const expectedUriWithoutLineNumber = Uri.file(`file://${expectedPath}`);
    const expectedUri = expectedUriWithoutLineNumber.with({fragment: `L${expectedLineNumber}`});
  
    const bookmark = new Bookmark(expectedUri, 'global');
    assert.ok(bookmark.matchesUri(expectedUri));
    assert.ok(bookmark.matchesUri(expectedUri, true));

    const differentLineUri = expectedUriWithoutLineNumber.with({fragment: `L${expectedLineNumber + 10}`});
    assert.ok(!bookmark.matchesUri(differentLineUri));
    assert.ok(bookmark.matchesUri(differentLineUri, true));
  });
});