import * as assert from 'assert';
import { basename, normalize } from 'path';
import { Uri } from 'vscode';
import { Bookmark, DEFAULT_LINE_NUMBER } from '../../bookmark';

suite(`Suite: ${basename(__filename, '.test.js')}`, () => {
  let restorables: { restore: () => void }[];

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
    assert.strictEqual(bookmark.hasLineNumer, false);
    assert.strictEqual(bookmark.lineNumber, DEFAULT_LINE_NUMBER);
    assert.strictEqual(bookmark.uri.toString(), expectedUri);

    const normalizedExpectedPath = normalize(expectedPath);
    assert.strictEqual(bookmark.defaultName, normalizedExpectedPath);
    assert.strictEqual(bookmark.displayName, normalizedExpectedPath);
  });

  test('basic props (with line-number)', () => {
    const expectedKind = 'global';
    const expectedLineNumber = 6;
    const expectedPath = '/workspace/test.txt';
    const expectedUri = `file://${expectedPath}#L${expectedLineNumber}`;
    const expectedName = `${expectedPath}:${expectedLineNumber}`;

    const bookmark = new Bookmark(expectedUri, expectedKind);

    assert.strictEqual(bookmark.kind, expectedKind);
    assert.strictEqual(bookmark.hasLineNumer, true);
    assert.strictEqual(bookmark.lineNumber, expectedLineNumber);
    assert.strictEqual(bookmark.uri.toString(), expectedUri);

    const normalizedExpectedName = normalize(expectedName);
    assert.strictEqual(bookmark.defaultName, normalizedExpectedName);
    assert.strictEqual(bookmark.displayName, normalizedExpectedName);
  });

  test('basic props (update line-number)', () => {
    const expectedLineNumber = 6;
    const expectedPath = '/workspace/test.txt';
    const expectedUri = `file://${expectedPath}#L${expectedLineNumber}`;

    const bookmark = new Bookmark(expectedUri, 'global');
    assert.strictEqual(bookmark.lineNumber, expectedLineNumber);
    assert.strictEqual(bookmark.uri.toString(), expectedUri);

    const newExpectedLineNumber = expectedLineNumber * 7;
    const newExpectedName = `${expectedPath}:${newExpectedLineNumber}`;
    const newNormalizedExpectedName = normalize(newExpectedName);
    
    bookmark.lineNumber = newExpectedLineNumber;

    assert.strictEqual(bookmark.lineNumber, newExpectedLineNumber);
    assert.strictEqual(bookmark.defaultName, newNormalizedExpectedName);
    assert.strictEqual(bookmark.displayName, newNormalizedExpectedName);
  });

  test('basic props (displayName)', () => {
    const expectedLineNumber = 6;
    const expectedPath = '/workspace/test.txt';
    const expectedUri = `file://${expectedPath}#L${expectedLineNumber}`;
    const expectedName = `${expectedPath}:${expectedLineNumber}`;
    const expectedDisplayName = 'Custom Name';

    const bookmark = new Bookmark(expectedUri, 'global');
    bookmark.displayName = expectedDisplayName;
    assert.strictEqual(bookmark.hasDisplayName, true);

    const normalizedExpectedName = normalize(expectedName);
    assert.strictEqual(bookmark.displayName, expectedDisplayName);
    assert.strictEqual(bookmark.defaultName, normalizedExpectedName);

    bookmark.displayName = undefined;
    assert.strictEqual(bookmark.hasDisplayName, false);
    assert.strictEqual(bookmark.displayName, bookmark.defaultName);
  });

  test('compare', () => {
    const bookmark1 = new Bookmark('file://file1#1', 'global');
    const bookmark2 = new Bookmark('file://file1#2', 'global');
    const bookmark3 = new Bookmark('file://file1#10', 'global');
    const bookmark4 = new Bookmark('file://file2#3', 'global');
    const bookmark5 = new Bookmark('file://file2#9', 'global');

    assert.deepStrictEqual(
      [bookmark4, bookmark1, bookmark5, bookmark3, bookmark2].sort((a, b) => a.compare(b)).map((b) => b.defaultName),
      [bookmark1, bookmark2, bookmark3, bookmark4, bookmark5].map((b) => b.defaultName))
  });

  test('compare (with same display name)', () => {
    const bookmark1 = new Bookmark('file://file1#1', 'global');
    const bookmark2 = new Bookmark('file://file1#10', 'global');
    const bookmark3 = new Bookmark('file://file2#2', 'global');
    const bookmark4 = new Bookmark('file://file2#20', 'global');
    
    [bookmark1, bookmark2, bookmark3, bookmark4].forEach((b) => b.displayName = 'FOO');

    assert.deepStrictEqual(
      [bookmark4, bookmark1, bookmark3, bookmark2].sort((a, b) => a.compare(b)).map((b) => b.defaultName),
      [bookmark1, bookmark2, bookmark3, bookmark4].map((b) => b.defaultName))
  });

  test('compare (with different kind)', () => {
    const bookmark1 = new Bookmark('file://file1#1', 'global');
    const bookmark2 = new Bookmark('file://file1#10', 'global');
    const bookmark3 = new Bookmark('file://file1#1', 'workspace');
    const bookmark4 = new Bookmark('file://file1#10', 'workspace');
    
    assert.deepStrictEqual(
      [bookmark4, bookmark1, bookmark3, bookmark2].sort((a, b) => a.compare(b)).map((b) => b.defaultName),
      [bookmark1, bookmark2, bookmark3, bookmark4].map((b) => b.defaultName))
  });


  test('matchesUri', () => {
    const expectedLineNumber = 6;
    const expectedPath = '/workspace/test.txt';
    const expectedUriWithoutLineNumber = Uri.file(`file://${expectedPath}`);
    const expectedUri = expectedUriWithoutLineNumber.with({ fragment: `L${expectedLineNumber}` });

    const bookmark = new Bookmark(expectedUri, 'global');
    assert.ok(bookmark.matchesUri(expectedUri));
    assert.ok(bookmark.matchesUri(expectedUri, true));

    const differentLineUri = expectedUriWithoutLineNumber.with({ fragment: `L${expectedLineNumber + 10}` });
    assert.ok(!bookmark.matchesUri(differentLineUri));
    assert.ok(bookmark.matchesUri(differentLineUri, true));
  });
});