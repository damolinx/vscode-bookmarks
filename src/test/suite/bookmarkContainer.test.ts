import * as vscode from 'vscode';
import * as assert from 'assert';
import { basename } from 'path';

import { createMockDatastore } from './datastore/common';
import { BookmarkKind } from '../../bookmark';
import { BookmarkContainer } from '../../bookmarkContainer';
import { CONTAINER_SCHEME } from '../../datastore/datastore';

suite(`Suite: ${basename(__filename, '.test.js')}`, () => {
  let restorables: { restore: () => void }[];

  setup(() => {
    restorables = [];
  });

  teardown(() => restorables.forEach((r) => r.restore()));

  test('addAsync: non-existing', async () => {
    const expectedUris = [
      vscode.Uri.parse('file://global/file1#L11', true),
      vscode.Uri.parse('file://global/file2#L22', true),
    ];

    const container = new BookmarkContainer('Global', 'global', createMockDatastore());
    const addedBookmarks = await container.addAsync(
      ...expectedUris.map((uri) => ({
        uri,
      }))
    );

    assert.deepStrictEqual(
      addedBookmarks.map((b) => b.uri),
      expectedUris
    );
  });

  test('addAsync: existing', async () => {
    const expectedUris = ['file://global/file1#L11', 'file://global/file2#L22'];

    const container = new BookmarkContainer(
      'Global',
      'global',
      createMockDatastore(...expectedUris)
    );
    const addedBookmarks = await container.addAsync(
      ...expectedUris.map((uri) => ({
        uri: vscode.Uri.parse(uri, true),
      }))
    );

    assert.deepStrictEqual(
      addedBookmarks.map((b) => b.uri),
      []
    );
  });

  test('createUriForName', () => {
    const expectedName = 'container';
    assert.strictEqual(
      BookmarkContainer.createUriForName(expectedName).toString(),
      `${CONTAINER_SCHEME}:${expectedName}`
    );

    const expectedGrandparentName = 'grandParent';
    const expectedParentName = 'parent';
    const parent = new BookmarkContainer(
      expectedParentName,
      new BookmarkContainer(expectedGrandparentName, 'global', createMockDatastore()),
      createMockDatastore()
    );
    assert.strictEqual(
      BookmarkContainer.createUriForName(expectedName, parent).toString(),
      `${CONTAINER_SCHEME}:${expectedGrandparentName}/${expectedParentName}/${expectedName}`
    );
  });

  test('count', () => {
    const expectedUris = ['file://global/file1#L11', 'file://global/file2#L22'];
    const container = new BookmarkContainer(
      'Global',
      'global',
      createMockDatastore(...expectedUris)
    );
    assert.strictEqual(container.count, expectedUris.length);
  });

  test('getItem', () => {
    const expectedUris = ['file://global/file1#L10', 'file://global/file2#L20'];
    const container = new BookmarkContainer(
      'Global',
      'global',
      createMockDatastore(...expectedUris)
    );
    assert.deepStrictEqual(
      container.getItem(vscode.Uri.parse(expectedUris[1]))?.uri.toString(),
      expectedUris[1]
    );
  });

  test('getItems', () => {
    const expectedUris = ['file://global/file1#L1', 'file://global/file2#L2'];
    const container = new BookmarkContainer(
      'Global',
      'global',
      createMockDatastore(...expectedUris)
    );
    assert.deepStrictEqual(
      container.getItems().map((b) => b.uri.toString()),
      expectedUris
    );
  });

  test('kind', () => {
    const expectedKind: BookmarkKind = 'global';
    const container = new BookmarkContainer(
      'Global',
      'global',
      createMockDatastore('file://global/file1')
    );
    assert.strictEqual(container.kind, expectedKind);
  });
});
