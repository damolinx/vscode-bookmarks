import * as assert from 'assert';
import { basename } from 'path';

import { createMockMemento } from './common';
import { BookmarkDatastore } from '../../../datastore/bookmarkDataStore';
import { Bookmark, BookmarkKind } from '../../../bookmark';
import { MementoDatastore } from '../../../datastore/mementoDatastore';

suite(`Suite: ${basename(__filename, '.test.js')}`, () => {
  let restorables: { restore: () => void }[];

  setup(() => {
    restorables = [];
  });

  teardown(() => restorables.forEach((r) => r.restore()));

  test('addAsync: non-existing', async () => {
    const expectedBookmark = new Bookmark('file://global/file2', 'global');
    const datastore = createBookmarkStore('global', 'file://global/file1');

    const addedBookmarks = await datastore.addAsync(expectedBookmark);

    assert.deepStrictEqual(addedBookmarks, [expectedBookmark]);
  });
});

function createBookmarkStore(kind: BookmarkKind, ...uris: string[]) {
  return new BookmarkDatastore(kind, new MementoDatastore(createMockMemento(...uris)));
}
