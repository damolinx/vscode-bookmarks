import * as vscode from 'vscode';
import * as assert from 'assert';
import { basename } from 'path';

import { Bookmark } from '../../bookmark';
import { BookmarkManager } from '../../bookmarkManager';
import { V1_MEMENTO_KEY_NAME } from '../../datastore/mementoDatastore';

suite(`Suite: ${basename(__filename, '.test.js')}`, () => {
  let restorables: { restore: () => void }[];

  setup(() => {
    restorables = [];
  });

  teardown(() => restorables.forEach((r) => r.restore()));

  test('hasBookmarks: empty', async () => {
    const manager = createBookmarkManager([], []);

    assert.strictEqual(manager.hasBookmarks({ kind: 'global' }), false);
    assert.strictEqual(manager.hasBookmarks({ kind: 'workspace' }), false);
    assert.strictEqual(manager.hasBookmarks(), false);
  });

  test('hasBookmarks: existing', async () => {
    const expectedGlobal = ['file:///global/file1', 'file:///global/file2'];
    const expectedWorkspace = ['file:///workspace/file1', 'file:///workspace/file2'];

    const manager = createBookmarkManager(expectedGlobal, expectedWorkspace);
    assert.strictEqual(manager.hasBookmarks({ kind: 'global' }), true);
    assert.strictEqual(manager.hasBookmarks({ kind: 'workspace' }), true);
    assert.strictEqual(manager.hasBookmarks(), true);
  });

  test('getBookmarks: empty', async () => {
    const manager = createBookmarkManager([], []);

    assert.deepStrictEqual(manager.getBookmarks({ kind: 'global' }), []);
    assert.deepStrictEqual(manager.getBookmarks({ kind: 'workspace' }), []);
    assert.deepStrictEqual(manager.getBookmarks(), []);
  });

  test('getBookmarks(kind): existing', async () => {
    const expectedGlobal = ['file:///global/file1', 'file:///global/file2'];
    const expectedWorkspace = ['file:///workspace/file1', 'file:///workspace/file2'];
    const manager = createBookmarkManager(expectedGlobal, expectedWorkspace);
    const globalContainer = manager.getRootContainer('global');
    const workspaceContainer = manager.getRootContainer('workspace');

    const expectedGlobalBookmarks = expectedGlobal.map(
      (s) => new Bookmark(globalContainer, s),
    );
    const expectedWorkspaceBookmarks = expectedWorkspace.map(
      (s) => new Bookmark(workspaceContainer, s),
    );

    assert.deepStrictEqual(
      manager.getBookmarks({ kind: 'global' }),
      expectedGlobalBookmarks,
    );
    assert.deepStrictEqual(
      manager.getBookmarks({ kind: 'workspace' }),
      expectedWorkspaceBookmarks,
    );
    assert.deepStrictEqual(
      manager.getBookmarks(),
      expectedGlobalBookmarks.concat(expectedWorkspaceBookmarks),
    );
  });

  test('getBookmarks(URI, exact): existing', async () => {
    const targetFile = 'file:///test/file1';
    const expectedGlobal = [`${targetFile}#L111`, targetFile];
    const expectedWorkspace = [targetFile, `${targetFile}#L222`];
    const manager = createBookmarkManager(expectedGlobal, expectedWorkspace);
    const globalContainer = manager.getRootContainer('global');
    const workspaceContainer = manager.getRootContainer('workspace');

    const expectedGlobalBookmarks = expectedGlobal.map(
      (s) => new Bookmark(globalContainer, s),
    );
    const expectedWorkspaceBookmarks = expectedWorkspace.map(
      (s) => new Bookmark(workspaceContainer, s),
    );

    assert.deepStrictEqual(manager.getBookmarks({ uri: expectedGlobalBookmarks[0].uri }), [
      expectedGlobalBookmarks[0],
    ]);
    assert.deepStrictEqual(
      manager.getBookmarks({ uri: expectedWorkspaceBookmarks[1].uri }),
      [expectedWorkspaceBookmarks[1]],
    );
    assert.deepStrictEqual(manager.getBookmarks({ uri: expectedGlobalBookmarks[1].uri }), [
      expectedGlobalBookmarks[1],
      expectedWorkspaceBookmarks[0],
    ]);
  });

  test('getBookmarks(URI, ignoreLineNumber: true): existing', async () => {
    const targetFile = 'file:///test/file1';
    const expectedGlobal = [`${targetFile}#L111`, targetFile];
    const expectedWorkspace = [targetFile, `${targetFile}#L222`];
    const manager = createBookmarkManager(expectedGlobal, expectedWorkspace);
    const globalContainer = manager.getRootContainer('global');
    const workspaceContainer = manager.getRootContainer('workspace');

    const expectedGlobalBookmarks = expectedGlobal.map(
      (s) => new Bookmark(globalContainer, s),
    );
    const expectedWorkspaceBookmarks = expectedWorkspace.map(
      (s) => new Bookmark(workspaceContainer, s),
    );
    const expectedBookmarks = expectedGlobalBookmarks.concat(expectedWorkspaceBookmarks);

    assert.deepStrictEqual(
      manager.getBookmarks({
        uri: expectedGlobalBookmarks[0].uri,
        ignoreLineNumber: true,
      }),
      expectedBookmarks,
    );
    assert.deepStrictEqual(
      manager.getBookmarks({
        uri: expectedWorkspaceBookmarks[1].uri,
        ignoreLineNumber: true,
      }),
      expectedBookmarks,
    );
  });

  test('getBookmarks(kind, URI, ignoreLineNumber): existing', async () => {
    const targetFile = 'file:///test/file1';
    const expectedGlobal = [`${targetFile}#L111`, targetFile];
    const expectedWorkspace = [targetFile, `${targetFile}#L222`];
    const manager = createBookmarkManager(expectedGlobal, expectedWorkspace);
    const globalContainer = manager.getRootContainer('global');
    const workspaceContainer = manager.getRootContainer('workspace');
    const expectedGlobalBookmarks = expectedGlobal.map(
      (s) => new Bookmark(globalContainer, s),
    );
    const expectedWorkspaceBookmarks = expectedWorkspace.map(
      (s) => new Bookmark(workspaceContainer, s),
    );

    assert.deepStrictEqual(manager.getBookmarks({ uri: expectedGlobalBookmarks[0].uri }), [
      expectedGlobalBookmarks[0],
    ]);
    assert.deepStrictEqual(
      manager.getBookmarks({
        uri: expectedGlobalBookmarks[0].uri,
        kind: 'workspace',
      }),
      [],
    );
    assert.deepStrictEqual(
      manager.getBookmarks({
        uri: expectedGlobalBookmarks[1].uri,
        ignoreLineNumber: true,
        kind: 'workspace',
      }),
      expectedWorkspaceBookmarks,
    );
  });
});

function createBookmarkManager(expectedGlobal: string[], expectedWorkspace: string[]) {
  return new BookmarkManager(({
    globalState: createMockMemento(...expectedGlobal),
    workspaceState: createMockMemento(...expectedWorkspace),
  } as vscode.ExtensionContext));
}

export function createMockMemento(...uris: string[]): vscode.Memento {
  let store = Object.fromEntries(uris.map((uri) => [uri, {}]));
  return {
    keys() {
      assert.fail('Unexpected call');
    },
    get<T>(key: string, defaultValue?: T) {
      assert.strictEqual(key, V1_MEMENTO_KEY_NAME);
      return store ?? defaultValue;
    },
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    update(key: string, value: any): Promise<void> {
      assert.strictEqual(key, V1_MEMENTO_KEY_NAME);
      store = value;
      return Promise.resolve();
    },
  } as vscode.Memento;
}
