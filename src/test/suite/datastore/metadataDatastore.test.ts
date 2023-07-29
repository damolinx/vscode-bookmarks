import * as vscode from 'vscode';
import * as assert from 'assert';
import { basename } from 'path';

import {
  CONTAINER_METADATA_KEY,
  MetadataDatastore,
  RawMetadata,
} from '../../../datastore/metadataDatastore';
import { CONTAINER_SCHEME, Datastore, RawDatastore } from '../../../datastore/datastore';

suite(`Suite: ${basename(__filename, '.test.js')}`, () => {
  let restorables: { restore: () => void }[];

  setup(() => {
    restorables = [];
  });

  teardown(() => restorables.forEach((r) => r.restore()));

  test('addAsync: non-existing', async () => {
    const expectedUri1 = vscode.Uri.file('/global/sub/file1');
    const expectedMetadata1 = {};
    const expectedUri2 = vscode.Uri.file('/global/sub/file2');
    const expectedMetadata2 = {
      prop1: 'test prop1 value',
      prop2: 'test prop2 value',
    };

    const storeUri = vscode.Uri.parse(`${CONTAINER_SCHEME}://global/folder`, true);
    const storeMetadata: RawMetadata = {};
    const rawDatastore: RawDatastore = {
      get: () => ({}),
      setAsync: (state) => {
        assert.deepStrictEqual(state, {
          [storeUri.toString()]: {
            [CONTAINER_METADATA_KEY]: {
              [expectedUri1.toString()]: expectedMetadata1,
              [expectedUri2.toString()]: expectedMetadata2,
            },
          },
        });
      },
    };
    const parentDatastore = new Datastore(rawDatastore);
    const datastore = new MetadataDatastore(storeUri, storeMetadata, parentDatastore);

    const addedUris = await datastore.addAsync([
      { uri: expectedUri1 },
      { uri: expectedUri2, metadata: expectedMetadata2 },
    ]);
    assert.deepStrictEqual(addedUris, [expectedUri1, expectedUri2]);
  });

  test('removeAsync: existing', async () => {
    const expectedUri1 = vscode.Uri.file('/global/sub/file1');
    const expectedMetadata1 = {};
    const expectedUri2 = vscode.Uri.file('/global/sub/file2');
    const expectedMetadata2 = {
      prop1: 'test prop1 value',
      prop2: 'test prop2 value',
    };

    const storeUri = vscode.Uri.parse(`${CONTAINER_SCHEME}://global/folder`, true);
    const storeMetadata: RawMetadata = {
      [CONTAINER_METADATA_KEY]: {
        [expectedUri1.toString()]: expectedMetadata1,
        [expectedUri2.toString()]: expectedMetadata2,
      },
    };
    const rawDatastore: RawDatastore = {
      get: () => ({}),
      setAsync: (state) => {
        assert.deepStrictEqual(state, {
          [storeUri.toString()]: {
            [CONTAINER_METADATA_KEY]: {
              [expectedUri1.toString()]: expectedMetadata1,
            },
          },
        });
      },
    };
    const parentDatastore = new Datastore(rawDatastore);
    const datastore = new MetadataDatastore(storeUri, storeMetadata, parentDatastore);

    const removedUris = await datastore.removeAsync(expectedUri2);
    assert.deepStrictEqual(removedUris, [expectedUri2]);
  });

  test('upgradeAsync ', async () => {
    const storeUri = vscode.Uri.parse(`${CONTAINER_SCHEME}://global/folder`, true);
    const storeMetadata: RawMetadata = {};
    const rawDatastore: RawDatastore = {
      get: () => {
        assert.fail('Unexpected call');
      },
      setAsync: () => {
        assert.fail('Unexpected call');
      },
    };
    const parentDatastore = new Datastore(rawDatastore);
    const datastore = new MetadataDatastore(storeUri, storeMetadata, parentDatastore);

    assert.strictEqual(await datastore.upgradeAsync(), false);
  });
});
