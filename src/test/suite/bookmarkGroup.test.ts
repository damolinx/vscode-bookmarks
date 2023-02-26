import * as assert from 'assert';
import { basename } from 'path';
import { Memento, Uri } from 'vscode';
import { Bookmark } from '../../bookmark';
import { V1_MEMENTO_KEY_NAME, V1_STORE_TYPE } from '../../bookmarkDatastore';
import { BookmarkGroup } from '../../bookmarkGroup';

suite(`Suite: ${basename(__filename, '.test.js')}`, () => {
  let restorables: { restore: () => void }[];

  setup(() => {
    restorables = [];
  });

  teardown(() => restorables.forEach((r) => r.restore()));

  test('basic props', () => {
    const expectedName = 'Test Group';
    const expectedKind = 'global';
    const bookmarkGroup = new BookmarkGroup(expectedName, expectedKind, createMockMemento([]));
    assert.strictEqual(bookmarkGroup.kind, expectedKind);
    assert.strictEqual(bookmarkGroup.displayName, expectedName);
  });

  test('addAsync: existing', async () => {
    const bookmarkUri = Uri.parse("file://global/file3");
    const expectedGlobal = ["file://global/file1", "file://global/file2", bookmarkUri.toString()];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    const result = await bookmarkGroup.addAsync(bookmarkUri);
    assert.deepStrictEqual(result, []);
  });

  test('addAsync: non-existing', async () => {
    const expectedBookmarkUri = Uri.parse("file://global/file3");
    const expectedGlobal = ["file://global/file1", "file://global/file2"];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    const result = await bookmarkGroup.addAsync(expectedBookmarkUri);
    assert.deepStrictEqual(result, [new Bookmark(expectedBookmarkUri, bookmarkGroup.kind)]);
  });

  test('get: empty', () => {
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento([]));
    assert.strictEqual(bookmarkGroup.get(Uri.parse("file://global/file1")), undefined);
  });

  test('get: existing', () => {
    const expectedBookmarkUri = Uri.parse("file://global/file3");
    const expectedGlobal = ["file://global/file1", "file://global/file2", expectedBookmarkUri.toString()];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    assert.deepStrictEqual(
      bookmarkGroup.get(expectedBookmarkUri),
      new Bookmark(expectedBookmarkUri, bookmarkGroup.kind));
  });

  test('get: non-existing', () => {
    const expectedGlobal = ["file://global/file1", "file://global/file2"];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    assert.strictEqual(bookmarkGroup.get(Uri.parse("file://global/file3")), undefined);
  });

  test('count: empty', () => {
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento([]));
    assert.strictEqual(bookmarkGroup.count, 0);
  });

  test('count: existing', () => {
    const expectedGlobal = ["file://global/file1", "file://global/file2"];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    assert.strictEqual(bookmarkGroup.count, expectedGlobal.length);
  });

  test('getAll: empty', () => {
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento([]));
    assert.deepStrictEqual(bookmarkGroup.getAll(), []);
  });

  test('getAll: existing', () => {
    const expectedGlobal = ["file://global/file1", "file://global/file2"];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    assert.deepStrictEqual(
      bookmarkGroup.getAll(),
      expectedGlobal.map((uri) => new Bookmark(uri, bookmarkGroup.kind)));
  });

  test('removeAllAsync: empty', async () => {
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento([]));
    assert.strictEqual(bookmarkGroup.count, 0);

    const result = await bookmarkGroup.removeAllAsync();
    assert.deepStrictEqual(result, []);
    assert.deepStrictEqual([], bookmarkGroup.getAll());
  });

  test('removeAllAsync: existing', async () => {
    const expectedGlobal = ["file://global/file1", "file://global/file2"];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    assert.strictEqual(bookmarkGroup.count, expectedGlobal.length);

    const result = await bookmarkGroup.removeAllAsync();
    assert.strictEqual(result.length, expectedGlobal.length);
    assert.strictEqual(bookmarkGroup.count, 0);
  });

  test('removeAsync: empty', async () => {
    const expectedBookmarkUri = Uri.parse("file://global/file1");
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento([]));
    const bookmark = new Bookmark(expectedBookmarkUri, bookmarkGroup.kind);
    const result = await bookmarkGroup.removeAsync([bookmark]);
    assert.deepStrictEqual(result, []);
  });

  test('removeAsync: existing', async () => {
    const expectedBookmarkUri = Uri.parse("file://global/file3");
    const expectedGlobal = ["file://global/file1", "file://global/file2", expectedBookmarkUri.toString()];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    const expectedBookmark = new Bookmark(expectedBookmarkUri, bookmarkGroup.kind);
    const result = await bookmarkGroup.removeAsync([expectedBookmark]);
    assert.deepStrictEqual(result, [expectedBookmark]);
  });

  test('removeAsync: non-existing', async () => {
    const expectedBookmarkUri = Uri.parse("file://global/file3");
    const expectedGlobal = ["file://global/file1", "file://global/file2"];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));
    const bookmark = new Bookmark(expectedBookmarkUri, bookmarkGroup.kind);
    const result = await bookmarkGroup.removeAsync([bookmark]);
    assert.deepStrictEqual(result, []);
  });

  test('removeAsync: some existing', async () => {
    const bookmarkUri = Uri.parse("file://global/file2");
    const expectedBookmarkUri = Uri.parse("file://global/file4");
    const expectedGlobal = ["file://global/file1", expectedBookmarkUri.toString(), "file://global/file3"];
    const bookmarkGroup = new BookmarkGroup('Test', 'global', createMockMemento(expectedGlobal));

    const bookmark = new Bookmark(bookmarkUri, bookmarkGroup.kind);
    const expectedBookmark = new Bookmark(expectedBookmarkUri, bookmarkGroup.kind);
    const result = await bookmarkGroup.removeAsync([expectedBookmark, bookmark]);
    assert.deepStrictEqual(result, [expectedBookmark]);
  });
});

function createMockMemento(uris: string[]): Memento {
  let savedUris = uris.reduce((m, v) => {
    m[v] = {};
    return m;
  }, <V1_STORE_TYPE>{});
  return <any>{
    get<T>(key: string, defaultValue: T) {
      assert.strictEqual(key, V1_MEMENTO_KEY_NAME);
      return savedUris ?? defaultValue;
    },
    update(key: string, value: any): Promise<void> {
      assert.strictEqual(key, V1_MEMENTO_KEY_NAME);
      savedUris = value;
      return Promise.resolve();
    }
  };
}