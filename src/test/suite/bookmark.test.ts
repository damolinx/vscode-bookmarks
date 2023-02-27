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