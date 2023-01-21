import * as assert from 'assert';
import { basename } from 'path';

import { Bookmark } from '../../bookmark';
import { V1_MEMENTO_KEY_NAME, V1_STORE_TYPE } from '../../bookmarkDatastore';
import { BookmarkManager } from '../../bookmarkManager';

suite(`Suite: ${basename(__filename, '.test.js')}`, () => {
  let restorables: Array<{ restore: () => void }>;

  setup(() => {
    restorables = [];
  });

  teardown(() => restorables.forEach((r) => r.restore()));

  test('hasBookmarks: empty', async () => {
    const manager = createBookmarkManager([], []);

    assert.strictEqual(manager.hasBookmarks('global'), false);
    assert.strictEqual(manager.hasBookmarks('workspace'), false);
    assert.strictEqual(manager.hasBookmarks(), false);
  });

  test('hasBookmarks: existing', async () => {
    const expectedGlobal = ["file:///global/file1", "file:///global/file2"];
    const expectedWorkspace = ["file:///workspace/file1", "file:///workspace/file2"];

    const manager = createBookmarkManager(expectedGlobal, expectedWorkspace);
    assert.strictEqual(manager.hasBookmarks('global'), true);
    assert.strictEqual(manager.hasBookmarks('workspace'), true);
    assert.strictEqual(manager.hasBookmarks(), true);
  });

  test('getBookmarks: empty', async () => {
    const manager = createBookmarkManager([], []);

    assert.deepStrictEqual(manager.getBookmarks({ kind: 'global' }), []);
    assert.deepStrictEqual(manager.getBookmarks({ kind: 'workspace' }), []);
    assert.deepStrictEqual(manager.getBookmarks(), []);
  });

  test('getBookmarks(kind): existing', async () => {
    const expectedGlobal = ["file:///global/file1", "file:///global/file2"];
    const expectedWorkspace = ["file:///workspace/file1", "file:///workspace/file2"];
    const manager = createBookmarkManager(expectedGlobal, expectedWorkspace);
    const expectedGlobalBookmarks = expectedGlobal.map(s => new Bookmark(s, 'global'));
    const expectedWorkspaceBookmarks = expectedWorkspace.map(s => new Bookmark(s, 'workspace'));

    assert.deepStrictEqual(manager.getBookmarks({ kind: 'global' }), expectedGlobalBookmarks);
    assert.deepStrictEqual(manager.getBookmarks({ kind: 'workspace' }), expectedWorkspaceBookmarks);
    assert.deepStrictEqual(manager.getBookmarks(), expectedGlobalBookmarks.concat(expectedWorkspaceBookmarks));
  });

  test('getBookmarks(URI, exact): existing', async () => {
    const targetFile = "file:///test/file1";
    const expectedGlobal = [`${targetFile}#L111`, targetFile];
    const expectedWorkspace = [targetFile, `${targetFile}#L222`];
    const manager = createBookmarkManager(expectedGlobal, expectedWorkspace);
    const expectedGlobalBookmarks = expectedGlobal.map(s => new Bookmark(s, 'global'));
    const expectedWorkspaceBookmarks = expectedWorkspace.map(s => new Bookmark(s, 'workspace'));

    assert.deepStrictEqual(
      manager.getBookmarks({ uri: expectedGlobalBookmarks[0].uri }),
      [expectedGlobalBookmarks[0]]);
    assert.deepStrictEqual(
      manager.getBookmarks({ uri: expectedWorkspaceBookmarks[1].uri }),
      [expectedWorkspaceBookmarks[1]]);
    assert.deepStrictEqual(
      manager.getBookmarks({ uri: expectedGlobalBookmarks[1].uri }),
      [expectedGlobalBookmarks[1], expectedWorkspaceBookmarks[0]]);
  });

  test('getBookmarks(URI, ignoreLineNumber: true): existing', async () => {
    const targetFile = "file:///test/file1";
    const expectedGlobal = [`${targetFile}#L111`, targetFile];
    const expectedWorkspace = [targetFile, `${targetFile}#L222`];
    const manager = createBookmarkManager(expectedGlobal, expectedWorkspace);
    const expectedGlobalBookmarks = expectedGlobal.map(s => new Bookmark(s, 'global'));
    const expectedWorkspaceBookmarks = expectedWorkspace.map(s => new Bookmark(s, 'workspace'));
    const expectedBookmarks = expectedGlobalBookmarks.concat(expectedWorkspaceBookmarks);

    assert.deepStrictEqual(
      manager.getBookmarks({ uri: expectedGlobalBookmarks[0].uri, ignoreLineNumber: true }),
      expectedBookmarks);
    assert.deepStrictEqual(
      manager.getBookmarks({ uri: expectedWorkspaceBookmarks[1].uri, ignoreLineNumber: true }),
      expectedBookmarks);
  });

  test('getBookmarks(kind, URI, ignoreLineNumber): existing', async () => {
    const targetFile = "file:///test/file1";
    const expectedGlobal = [`${targetFile}#L111`, targetFile];
    const expectedWorkspace = [targetFile, `${targetFile}#L222`];
    const manager = createBookmarkManager(expectedGlobal, expectedWorkspace);
    const expectedGlobalBookmarks = expectedGlobal.map(s => new Bookmark(s, 'global'));
    const expectedWorkspaceBookmarks = expectedWorkspace.map(s => new Bookmark(s, 'workspace'));

    assert.deepStrictEqual(
      manager.getBookmarks({ uri: expectedGlobalBookmarks[0].uri }),
      [expectedGlobalBookmarks[0]]);
    assert.deepStrictEqual(
      manager.getBookmarks({ uri: expectedGlobalBookmarks[0].uri, kind: 'workspace' }),
      []);
    assert.deepStrictEqual(
      manager.getBookmarks({ uri: expectedGlobalBookmarks[1].uri, ignoreLineNumber: true, kind: 'workspace' }),
      expectedWorkspaceBookmarks);
  });
});

function createBookmarkManager(expectedGlobal: string[], expectedWorkspace: string[]) {
  const global = expectedGlobal.reduce((m, v) => {
    m[v] = {};
    return m;
  }, <V1_STORE_TYPE>{});

  const workspace = expectedWorkspace.reduce((m, v) => {
    m[v] = {};
    return m;
  }, <V1_STORE_TYPE>{});

  return new BookmarkManager(<any>{
    globalState: <any>{
      get<T>(key: string, _defaultValue: T) {
        assert.strictEqual(key, V1_MEMENTO_KEY_NAME);
        return global;
      }
    },
    workspaceState: <any>{
      get<T>(key: string, _defaultValue: T) {
        assert.strictEqual(key, V1_MEMENTO_KEY_NAME);
        return workspace;
      }
    },
  });
}