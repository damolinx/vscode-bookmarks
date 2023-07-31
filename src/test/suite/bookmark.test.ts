import * as assert from 'assert';
import { basename, normalize } from 'path';
import { Uri } from 'vscode';
import { Bookmark, DEFAULT_LINE_NUMBER } from '../../bookmark';
import { BookmarkContainer } from '../../bookmarkContainer';
import { createMockDatastore } from './datastore/common';

suite(`Suite: ${basename(__filename, '.test.js')}`, () => {
  let restorables: { restore: () => void }[];
  let globalContainer: BookmarkContainer;
  let workspaceContainer: BookmarkContainer;

  setup(() => {
    restorables = [];
    const mockDatastore = createMockDatastore();
    globalContainer = new BookmarkContainer('', 'global', mockDatastore);
    workspaceContainer = new BookmarkContainer('', 'workspace', mockDatastore);
  });

  teardown(() => restorables.forEach((r) => r.restore()));

  test('basic props', () => {
    const expectedPath = '/workspace/test.txt';
    const sourceUri = `file://${expectedPath}`;
    const expectedUri = `${sourceUri}#L${DEFAULT_LINE_NUMBER}`;

    const bookmark = new Bookmark(workspaceContainer, sourceUri);

    assert.strictEqual(bookmark.kind, workspaceContainer.kind);
    assert.strictEqual(bookmark.lineNumber, DEFAULT_LINE_NUMBER);
    assert.strictEqual(bookmark.uri.toString(), expectedUri);

    const normalizedExpectedPath = normalize(expectedPath);
    assert.strictEqual(bookmark.defaultName, normalizedExpectedPath);
    assert.strictEqual(bookmark.displayName, normalizedExpectedPath);
    assert.strictEqual(bookmark.hasDisplayName, false);
  });

  test('basic props (with line-number)', () => {
    const expectedLineNumber = 6;
    const expectedPath = '/workspace/test.txt';
    const expectedUri = `file://${expectedPath}#L${expectedLineNumber}`;

    const bookmark = new Bookmark(globalContainer, expectedUri);

    assert.strictEqual(bookmark.kind, globalContainer.kind);
    assert.strictEqual(bookmark.lineNumber, expectedLineNumber);
    assert.strictEqual(bookmark.uri.toString(), expectedUri);

    const normalizedExpectedPath = normalize(expectedPath);
    assert.strictEqual(bookmark.defaultName, normalizedExpectedPath);
    assert.strictEqual(bookmark.displayName, normalizedExpectedPath);
    assert.strictEqual(bookmark.hasDisplayName, false);
  });

  test('compare', () => {
    const bookmark1 = new Bookmark(globalContainer, 'file://file1#1');
    const bookmark2 = new Bookmark(globalContainer, 'file://file1#2');
    const bookmark3 = new Bookmark(globalContainer, 'file://file1#10');
    const bookmark4 = new Bookmark(globalContainer, 'file://file2#3');
    const bookmark5 = new Bookmark(globalContainer, 'file://file2#9');

    assert.deepStrictEqual(
      [bookmark4, bookmark1, bookmark5, bookmark3, bookmark2]
        .sort((a, b) => a.compare(b))
        .map((b) => b.defaultName),
      [bookmark1, bookmark2, bookmark3, bookmark4, bookmark5].map((b) => b.defaultName)
    );
  });

  test('compare (with same display name)', () => {
    const bookmark1 = new Bookmark(globalContainer, 'file://file1#10').with({
      displayName: 'FOO',
    });
    const bookmark2 = new Bookmark(globalContainer, 'file://file1#101').with({
      displayName: 'FOO',
    });
    const bookmark3 = new Bookmark(globalContainer, 'file://file2#20').with({
      displayName: 'FOO',
    });
    const bookmark4 = new Bookmark(globalContainer, 'file://file2#202').with({
      displayName: 'FOO',
    });

    assert.deepStrictEqual(
      [bookmark4, bookmark1, bookmark3, bookmark2]
        .sort((a, b) => a.compare(b))
        .map((b) => b.defaultName),
      [bookmark1, bookmark2, bookmark3, bookmark4].map((b) => b.defaultName)
    );
  });

  test('compare (with different kind)', () => {
    const bookmark1 = new Bookmark(globalContainer, 'file://file1#1');
    const bookmark2 = new Bookmark(globalContainer, 'file://file1#10');
    const bookmark3 = new Bookmark(workspaceContainer, 'file://file1#1');
    const bookmark4 = new Bookmark(workspaceContainer, 'file://file1#10');

    assert.deepStrictEqual(
      [bookmark4, bookmark1, bookmark3, bookmark2]
        .sort((a, b) => a.compare(b))
        .map((b) => b.defaultName),
      [bookmark1, bookmark2, bookmark3, bookmark4].map((b) => b.defaultName)
    );
  });

  test('matchesUri', () => {
    const expectedLineNumber = 6;
    const expectedPath = '/workspace/test.txt';
    const expectedUriWithoutLineNumber = Uri.file(`file://${expectedPath}`);
    const expectedUri = expectedUriWithoutLineNumber.with({
      fragment: `L${expectedLineNumber}`,
    });

    const bookmark = new Bookmark(globalContainer, expectedUri);
    assert.ok(bookmark.matchesUri(expectedUri));
    assert.ok(bookmark.matchesUri(expectedUri, true));

    const differentLineUri = expectedUriWithoutLineNumber.with({
      fragment: `L${expectedLineNumber + 10}`,
    });
    assert.ok(!bookmark.matchesUri(differentLineUri));
    assert.ok(bookmark.matchesUri(differentLineUri, true));
  });
});
