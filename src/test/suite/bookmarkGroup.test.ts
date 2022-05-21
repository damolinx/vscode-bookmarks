import * as assert from 'assert';
import { basename } from 'path';
import { Memento, Uri } from 'vscode';
import { Bookmark } from '../../bookmark';
import { BookmarkGroup, MEMENTO_KEY_NAME } from '../../bookmarkGroup';

suite(`Suite: ${basename(__filename)}`, () => {
  let restorables: Array<{ restore: () => void }>;

  setup(() => {
    restorables = [];
  });

  teardown(() => {
    restorables.forEach((r) => r.restore());
  });

  test('basic props', () => {
    const expectedName = 'Test Group';
    const expectedKind = 'global';
    const bookmarkGroup = new BookmarkGroup(expectedName, expectedKind, createMockMemento([]));
    assert.strictEqual(bookmarkGroup.kind, expectedKind);
    assert.strictEqual(bookmarkGroup.name, expectedName);
  });

  test('addBookmarksAsync: empty', async () => {
    const expectedBookmarkUri = Uri.parse("file://global/file1");
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento([]));
    const result = await bookmarkGroup.addBookmarksAsync([expectedBookmarkUri]);
    assert.deepStrictEqual(result, [new Bookmark(expectedBookmarkUri, bookmarkGroup)]);
  });

  test('addBookmarksAsync: existing', async () => {
    const bookmarkUri = Uri.parse("file://global/file3");
    const expectedGlobal = ["file://global/file1", "file://global/file2", bookmarkUri.toString()];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    const result = await bookmarkGroup.addBookmarksAsync([bookmarkUri]);
    assert.deepStrictEqual(result, []);
  });

  test('addBookmarksAsync: non-existing', async () => {
    const expectedBookmarkUri = Uri.parse("file://global/file3");
    const expectedGlobal = ["file://global/file1", "file://global/file2"];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    const result = await bookmarkGroup.addBookmarksAsync([expectedBookmarkUri]);
    assert.deepStrictEqual(result, [new Bookmark(expectedBookmarkUri, bookmarkGroup)]);
  });

  test('addBookmarksAsync: some existing', async () => {
    const bookmarkUri = Uri.parse("file://global/file2");
    const expectedBookmarkUri = Uri.parse("file://global/file4");
    const expectedGlobal = ["file://global/file1", bookmarkUri.toString(), "file://global/file3"];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));

    const result = await bookmarkGroup.addBookmarksAsync([expectedBookmarkUri, bookmarkUri]);
    assert.deepStrictEqual(result, [new Bookmark(expectedBookmarkUri, bookmarkGroup)]);
  });

  test('bookmarksCount: empty', () => {
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento([]));
    assert.strictEqual(bookmarkGroup.bookmarksCount, 0);
  });

  test('bookmarksCount: existing', () => {
    const expectedGlobal = ["file://global/file1", "file://global/file2"];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    assert.strictEqual(bookmarkGroup.bookmarksCount, expectedGlobal.length);
  });

  test('contains: empty', () => {
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento([]));
    assert.strictEqual(bookmarkGroup.contains(Uri.parse("file://global/file1")), false);
  });

  test('contains: existing', () => {
    const expectedBookmarkUri = Uri.parse("file://global/file3");
    const expectedGlobal = ["file://global/file1", "file://global/file2", expectedBookmarkUri.toString()];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    assert.strictEqual(bookmarkGroup.contains(expectedBookmarkUri), true);
  });

  test('contains: non-existing', () => {
    const expectedGlobal = ["file://global/file1", "file://global/file2"];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    assert.strictEqual(bookmarkGroup.contains(Uri.parse("file://global/file3")), false);
  });

  test('getBookmark: empty', () => {
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento([]));
    assert.strictEqual(bookmarkGroup.getBookmark(Uri.parse("file://global/file1")), undefined);
  });

  test('getBookmark: existing', () => {
    const expectedBookmarkUri = Uri.parse("file://global/file3");
    const expectedGlobal = ["file://global/file1", "file://global/file2", expectedBookmarkUri.toString()];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    assert.deepStrictEqual(
      bookmarkGroup.getBookmark(expectedBookmarkUri),
      new Bookmark(expectedBookmarkUri, bookmarkGroup));
  });

  test('getBookmark: non-existing', () => {
    const expectedGlobal = ["file://global/file1", "file://global/file2"];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    assert.strictEqual(bookmarkGroup.getBookmark(Uri.parse("file://global/file3")), undefined);
  });

  test('getBookmark: existing', () => {
    const expectedGlobal = ["file://global/file1", "file://global/file2"];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    assert.deepStrictEqual(
      bookmarkGroup.getBookmarks(),
      expectedGlobal.map((uri) => new Bookmark(Uri.parse(uri), bookmarkGroup)));
  });

  test('getBookmarks: empty', () => {
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento([]));
    assert.deepStrictEqual(bookmarkGroup.getBookmarks(), []);
  });

  test('getBookmarks: existing', () => {
    const expectedGlobal = ["file://global/file1", "file://global/file2"];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    assert.deepStrictEqual(
      bookmarkGroup.getBookmarks(),
      expectedGlobal.map((uri) => new Bookmark(Uri.parse(uri), bookmarkGroup)));
  });

  test('removeBookmarksAsync: empty', async () => {
    const expectedBookmarkUri = Uri.parse("file://global/file1");
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento([]));
    const bookmark = new Bookmark(expectedBookmarkUri, bookmarkGroup);
    const result = await bookmarkGroup.removeBookmarksAsync([bookmark]);
    assert.deepStrictEqual(result, []);
  });

  test('removeBookmarksAsync: existing', async () => {
    const expectedBookmarkUri = Uri.parse("file://global/file3");
    const expectedGlobal = ["file://global/file1", "file://global/file2", expectedBookmarkUri.toString()];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    const expectedBookmark = new Bookmark(expectedBookmarkUri, bookmarkGroup);
    const result = await bookmarkGroup.removeBookmarksAsync([expectedBookmark]);
    assert.deepStrictEqual(result, [expectedBookmark]);
  });

  test('removeBookmarksAsync: non-existing', async () => {
    const expectedBookmarkUri = Uri.parse("file://global/file3");
    const expectedGlobal = ["file://global/file1", "file://global/file2"];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    const bookmark = new Bookmark(expectedBookmarkUri, bookmarkGroup);
    const result = await bookmarkGroup.removeBookmarksAsync([bookmark]);
    assert.deepStrictEqual(result, []);
  });

  test('removeBookmarksAsync: some existing', async () => {
    const bookmarkUri = Uri.parse("file://global/file2");
    const expectedBookmarkUri = Uri.parse("file://global/file4");
    const expectedGlobal = ["file://global/file1", expectedBookmarkUri.toString(), "file://global/file3"];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));

    const bookmark = new Bookmark(bookmarkUri, bookmarkGroup);
    const expectedBookmark = new Bookmark(expectedBookmarkUri, bookmarkGroup);
    const result = await bookmarkGroup.removeBookmarksAsync([expectedBookmark, bookmark]);
    assert.deepStrictEqual(result, [expectedBookmark]);
  });
});

function createMockMemento(uris: string[]): Memento {
  let savedUris = uris;
  return <any>{
    get<T>(key: string, _defaultValue: T) {
      assert.strictEqual(key, MEMENTO_KEY_NAME);
      return savedUris;
    },
    update(key: string, value: any): Promise<void> {
      assert.strictEqual(key, MEMENTO_KEY_NAME);
      savedUris = value;
      return Promise.resolve();
    }
  };
}