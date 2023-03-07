import * as vscode from 'vscode';
import * as assert from 'assert';
import { basename } from 'path';

import {
  CONTAINER_METADATA_KEY,
  MetadataDatastore,
  MetadataType,
} from '../../../datastore/metadataDatastore';
import { Datastore, RawDatastore } from '../../../datastore/datastore';

suite(`Suite: ${basename(__filename, '.test.js')}`, () => {
  let restorables: { restore: () => void }[];

  setup(() => {
    restorables = [];
  });

  teardown(() => restorables.forEach((r) => r.restore()));

  test('addAsync: non-existing', async () => {
    const expectedUri1 = vscode.Uri.parse('file://global/sub/file1');
    const expectedMetadata1 = {};
    const expectedUri2 = vscode.Uri.parse('file://global/sub/file2');
    const expectedMetadata2 = {
      prop1: 'test prop1 value',
      prop2: 'test prop2 value',
    };

    const storeUri = vscode.Uri.parse('file://global/folder');
    const storeMetadata: MetadataType = {};
    const rawDatastore: RawDatastore = {
      get: () => ({}),
      setAsync: (state) => {
        assert.deepStrictEqual(
          state,
          Object.fromEntries([
            [
              storeUri,
              Object.fromEntries([
                [
                  CONTAINER_METADATA_KEY,
                  Object.fromEntries([
                    [expectedUri1, expectedMetadata1],
                    [expectedUri2, expectedMetadata2],
                  ]),
                ],
              ]),
            ],
          ])
        );
      },
    };
    const parentDatastore = new Datastore(rawDatastore);
    const datastore = new MetadataDatastore(storeUri, storeMetadata, parentDatastore);

    const addedUris = await datastore.addAsync([
      expectedUri1,
      [expectedUri2, expectedMetadata2],
    ]);
    assert.deepStrictEqual(addedUris, [expectedUri1, expectedUri2]);
  });

  test('upgradeAsync ', async () => {
    const storeUri = vscode.Uri.parse('file://global/folder');
    const storeMetadata: MetadataType = {};
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
