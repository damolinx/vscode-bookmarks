import * as vscode from 'vscode';
import * as assert from 'assert';
import { basename } from 'path';

import { createMockMemento } from './datastore/common';
import { BookmarkKind } from '../../bookmark';
import { BookmarkGroup } from '../../bookmarkGroup';
import { BookmarkDatastore } from '../../datastore/bookmarkDatastore';
import { MementoDatastore } from '../../datastore/mementoDatastore';

suite(`Suite: ${basename(__filename, '.test.js')}`, () => {
  let restorables: { restore: () => void }[];

  setup(() => {
    restorables = [];
  });

  teardown(() => restorables.forEach((r) => r.restore()));
  test('count', () => {
    const expectedUris = ['file://global/file1#L11', 'file://global/file2#L22'];
    const memento: vscode.Memento = createMockMemento(...expectedUris);
    const group = new BookmarkGroup(
      'Global',
      new BookmarkDatastore('global', new MementoDatastore(memento))
    );
    assert.strictEqual(group.count, expectedUris.length);
  });

  test('get', () => {
    const expectedUris = ['file://global/file1#L10', 'file://global/file2#L20'];
    const memento: vscode.Memento = createMockMemento(...expectedUris);
    const group = new BookmarkGroup(
      'Global',
      new BookmarkDatastore('global', new MementoDatastore(memento))
    );
    assert.deepStrictEqual(
      group.get(vscode.Uri.parse(expectedUris[1]))?.uri.toString(),
      expectedUris[1]
    );
  });

  test('getAll', () => {
    const expectedUris = ['file://global/file1#L1', 'file://global/file2#L2'];
    const memento: vscode.Memento = createMockMemento(...expectedUris);
    const group = new BookmarkGroup(
      'Global',
      new BookmarkDatastore('global', new MementoDatastore(memento))
    );
    assert.deepStrictEqual(
      group.getAll().map((b) => b.uri.toString()),
      expectedUris
    );
  });

  test('kind', () => {
    const expectedKind: BookmarkKind = 'global';
    const memento: vscode.Memento = createMockMemento('file://global/file1');
    const group = new BookmarkGroup(
      'Global',
      new BookmarkDatastore(expectedKind, new MementoDatastore(memento))
    );
    assert.strictEqual(group.kind, expectedKind);
  });
});
