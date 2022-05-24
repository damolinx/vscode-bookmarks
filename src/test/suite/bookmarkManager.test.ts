import * as assert from 'assert';
import { basename } from 'path';
import { Uri } from 'vscode';

import { Bookmark } from '../../bookmark';
import { MEMENTO_KEY_NAME } from '../../bookmarkGroup';
import { BookmarkManager } from '../../bookmarkManager';

suite(`Suite: ${basename(__filename)}`, () => {
  let restorables: Array<{ restore: () => void }>;

  setup(() => {
    restorables = [];
  });

  teardown(() => {
    restorables.forEach((r) => r.restore());
  });

  test('hasBookmarks: empty', async () => {
    const manager = createBookmarkManager([], []);

    assert.strictEqual(manager.hasBookmarks('global'), false);
    assert.strictEqual(manager.hasBookmarks('workspace'), false);
    assert.strictEqual(manager.hasBookmarks(), false);
  });

  test('hasBookmarks: existing', async () => {
    const expectedGlobal = ["file://global/file1", "file://global/file22"];
    const expectedWorkspace = ["file://workspace/file1", "file://workspace/file2"];

    const manager = createBookmarkManager(expectedGlobal, expectedWorkspace);
    assert.strictEqual(manager.hasBookmarks('global'), true);
    assert.strictEqual(manager.hasBookmarks('workspace'), true);
    assert.strictEqual(manager.hasBookmarks(), true);
  });

  test('getBookmarks: empty', async () => {
    const manager = createBookmarkManager([], []);

    assert.deepStrictEqual(manager.getBookmarks('global'), []);
    assert.deepStrictEqual(manager.getBookmarks('workspace'), []);
    assert.deepStrictEqual(manager.getBookmarks(), []);
  });

  test('getBookmarks: existing', async () => {
    const expectedGlobal = ["file://global/file1", "file://global/file22"];
    const expectedWorkspace = ["file://workspace/file1", "file://workspace/file2"];
    const manager = createBookmarkManager(expectedGlobal, expectedWorkspace);
    const expectedGlobalBookmarks = expectedGlobal.map(s => new Bookmark(Uri.parse(s), 'global'));
    const expectedWorkspaceBookmarks = expectedWorkspace.map(s => new Bookmark(Uri.parse(s), 'workspace'));

    assert.deepStrictEqual(manager.getBookmarks('global'), expectedGlobalBookmarks);
    assert.deepStrictEqual(manager.getBookmarks('workspace'), expectedWorkspaceBookmarks);
    assert.deepStrictEqual(manager.getBookmarks(), expectedGlobalBookmarks.concat(expectedWorkspaceBookmarks));
  });
});

function createBookmarkManager(expectedGlobal: string[], expectedWorkspace: string[]) {
  return new BookmarkManager(<any>{
    globalState: <any>{
      get<T>(key: string, _defaultValue: T) {
        assert.strictEqual(key, MEMENTO_KEY_NAME);
        return expectedGlobal;
      }
    },
    workspaceState: <any>{
      get<T>(key: string, _defaultValue: T) {
        assert.strictEqual(key, MEMENTO_KEY_NAME);
        return expectedWorkspace;
      }
    },
  });
}