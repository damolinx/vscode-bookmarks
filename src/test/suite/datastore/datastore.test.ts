import * as vscode from 'vscode';
import * as assert from 'assert';
import { basename } from 'path';

import { Datastore, RawDatastore } from '../../../datastore/datastore';

suite(`Suite: ${basename(__filename, '.test.js')}`, () => {
  let restorables: { restore: () => void }[];

  setup(() => {
    restorables = [];
  });

  teardown(() => restorables.forEach((r) => r.restore()));

  test('addAsync: non-existing', async () => {
    const expectedUri1 = vscode.Uri.file('/global/file1');
    const expectedMetadata1 = {};
    const expectedUri2 = vscode.Uri.file('/global/file2');
    const expectedMetadata2 = {
      prop1: 'test prop1 value',
      prop2: 'test prop2 value',
    };

    const rawDatastore: RawDatastore = {
      get: () => ({}),
      setAsync: (state) => {
        assert.deepStrictEqual(
          state,
          Object.fromEntries([
            [expectedUri1, expectedMetadata1],
            [expectedUri2, expectedMetadata2],
          ]),
        );
      },
    };
    const datastore = new Datastore(rawDatastore);

    const addedUris = await datastore.addAsync([
      { uri: expectedUri1 },
      { uri: expectedUri2, metadata: expectedMetadata2 },
    ]);
    assert.deepStrictEqual(addedUris, [expectedUri1, expectedUri2]);
  });

  test('addAsync: existing (override: false)', async () => {
    const expectedExistingUri = vscode.Uri.file('/global/file');
    const rawDatastore: RawDatastore = {
      get: () => Object.fromEntries([[expectedExistingUri, {}]]),
      setAsync: () => {
        assert.fail('Unexpected call');
      },
    };
    const datastore = new Datastore(rawDatastore);

    const addedUris = await datastore.addAsync([{ uri: expectedExistingUri }]);
    assert.deepStrictEqual(addedUris, []);
  });

  test('addAsync: existing (override: true)', async () => {
    const expectedExistingUri = vscode.Uri.file('/global/file');
    const expectedMetadata = {
      prop: 'test prop value',
    };

    const rawDatastore: RawDatastore = {
      get: () => Object.fromEntries([[expectedExistingUri, {}]]),
      setAsync: (state) => {
        assert.deepStrictEqual(
          state,
          Object.fromEntries([[expectedExistingUri, expectedMetadata]]),
        );
      },
    };
    const datastore = new Datastore(rawDatastore);

    const addedUris = await datastore.addAsync([{ uri: expectedExistingUri }]);
    assert.deepStrictEqual(addedUris, []);
  });

  test('contains: empty', () => {
    const expectedUri = vscode.Uri.file('/global/file');
    const rawDatastore: RawDatastore = {
      get: () => ({}),
      setAsync: () => {
        assert.fail('Unexpected call');
      },
    };
    const datastore = new Datastore(rawDatastore);

    assert.strictEqual(datastore.contains(expectedUri), false);
  });

  test('contains: existing', () => {
    const expectedUri = vscode.Uri.file('/global/file');

    const rawDatastore: RawDatastore = {
      get: () => Object.fromEntries([[expectedUri, {}]]),
      setAsync: () => {
        assert.fail('Unexpected call');
      },
    };
    const datastore = new Datastore(rawDatastore);

    assert.strictEqual(datastore.contains(expectedUri), true);
  });

  test('contains: non-existing', () => {
    const expectedUri = vscode.Uri.file('/global/file1');
    const expectedExistingUri = vscode.Uri.file('/global/file2');

    const rawDatastore: RawDatastore = {
      get: () => Object.fromEntries([[expectedExistingUri, {}]]),
      setAsync: () => {
        assert.fail('Unexpected call');
      },
    };
    const datastore = new Datastore(rawDatastore);

    assert.strictEqual(datastore.contains(expectedUri), false);
  });

  test('count: empty', () => {
    const rawDatastore: RawDatastore = {
      get: () => ({}),
      setAsync: () => {
        assert.fail('Unexpected call');
      },
    };
    const datastore = new Datastore(rawDatastore);

    assert.strictEqual(datastore.count, 0);
  });

  test('count: not-empty', () => {
    const rawDatastore: RawDatastore = {
      get: () => Object.fromEntries([[vscode.Uri.file('/global/file'), {}]]),
      setAsync: () => {
        assert.fail('Unexpected call');
      },
    };
    const datastore = new Datastore(rawDatastore);

    assert.strictEqual(datastore.count, 1);
  });

  test('get: existing', () => {
    const expectedUri = vscode.Uri.file('/global/file');
    const expectedMetadata = {
      prop: 'test prop value',
    };

    const rawDatastore: RawDatastore = {
      get: () => Object.fromEntries([[expectedUri, expectedMetadata]]),
      setAsync: () => {
        assert.fail('Unexpected call');
      },
    };
    const datastore = new Datastore(rawDatastore);

    assert.deepStrictEqual(datastore.getMetadata(expectedUri), expectedMetadata);
  });

  test('get: non-existing', () => {
    const expectedUri = vscode.Uri.file('/global/file1');
    const expectedExistingUri = vscode.Uri.file('/global/file2');

    const rawDatastore: RawDatastore = {
      get: () => Object.fromEntries([[expectedExistingUri, {}]]),
      setAsync: () => {
        assert.fail('Unexpected call');
      },
    };
    const datastore = new Datastore(rawDatastore);

    assert.strictEqual(datastore.getMetadata(expectedUri), undefined);
  });

  test('getAll: empty', () => {
    const rawDatastore: RawDatastore = {
      get: () => ({}),
      setAsync: () => {
        assert.fail('Unexpected call');
      },
    };
    const datastore = new Datastore(rawDatastore);

    assert.deepStrictEqual(datastore.getAll(), {});
  });

  test('getAll: not-empty', () => {
    const expectedStore = Object.fromEntries([
      [vscode.Uri.file('/global/file1'), {}],
      [vscode.Uri.file('/global/file2'), {}],
    ]);

    const rawDatastore: RawDatastore = {
      get: () => expectedStore,
      setAsync: () => {
        assert.fail('Unexpected call');
      },
    };
    const datastore = new Datastore(rawDatastore);

    assert.deepStrictEqual(datastore.getAll(), expectedStore);
  });

  test('removeAsync: existing', async () => {
    const expectedUri1 = vscode.Uri.file('/global/file1');
    const expectedMetadata1 = {
      prop1: 'test prop1 value',
    };
    const expectedUri2 = vscode.Uri.file('/global/file2');
    const expectedMetadata2 = {
      prop2: 'test prop2 value',
    };

    const rawDatastore: RawDatastore = {
      get: () =>
        Object.fromEntries([
          [expectedUri1, expectedMetadata1],
          [expectedUri2, expectedMetadata2],
        ]),
      setAsync: (state) => {
        assert.deepStrictEqual(
          state,
          Object.fromEntries([[expectedUri2, expectedMetadata2]]),
        );
      },
    };
    const datastore = new Datastore(rawDatastore);

    assert.deepStrictEqual(await datastore.removeAsync(expectedUri1), [expectedUri1]);
  });

  test('removeAsync: non-existing', async () => {
    const expectedUri = vscode.Uri.file('/global/file1');
    const expectedMetadata = {
      prop: 'test prop value',
    };
    const expectedUriNonExisting = vscode.Uri.file('/global/file2');
    const rawDatastore: RawDatastore = {
      get: () => Object.fromEntries([[expectedUri, expectedMetadata]]),
      setAsync: () => {
        assert.fail('Unexpected call');
      },
    };
    const datastore = new Datastore(rawDatastore);

    assert.deepStrictEqual(await datastore.removeAsync(expectedUriNonExisting), []);
  });

  test('removeAllAsync: empty', async () => {
    const rawDatastore: RawDatastore = {
      get: () => ({}),
      setAsync: (state) => {
        assert.strictEqual(state, undefined);
      },
    };
    const datastore = new Datastore(rawDatastore);

    await assert.doesNotReject(datastore.removeAllAsync());
  });

  test('removeAllAsync: non-empty', async () => {
    const expectedUri1 = vscode.Uri.file('/global/file1');
    const expectedMetadata1 = {
      prop1: 'test prop1 value',
    };
    const expectedUri2 = vscode.Uri.file('/global/file2');
    const expectedMetadata2 = {
      prop2: 'test prop1 value',
    };

    const rawDatastore: RawDatastore = {
      get: () =>
        Object.fromEntries([
          [expectedUri1, expectedMetadata1],
          [expectedUri2, expectedMetadata2],
        ]),
      setAsync: (state) => {
        assert.strictEqual(state, undefined);
      },
    };
    const datastore = new Datastore(rawDatastore);

    await assert.doesNotReject(datastore.removeAllAsync());
  });

  test('replaceAsync: existing', async () => {
    const expectedUri = vscode.Uri.file('/global/file');
    const expectedNewUri = vscode.Uri.file('/global/fileNew');
    const expectedMetadata = {
      prop: 'test prop value',
    };
    const rawDatastore: RawDatastore = {
      get: () => Object.fromEntries([[expectedUri, expectedMetadata]]),
      setAsync: (state) => {
        assert.deepStrictEqual(
          state,
          Object.fromEntries([[expectedNewUri, expectedMetadata]]),
        );
      },
    };
    const datastore = new Datastore(rawDatastore);

    assert.deepStrictEqual(
      await datastore.replaceAsync(expectedUri, expectedNewUri),
      expectedMetadata,
    );
  });

  test('replaceAsync: non-existing', async () => {
    const expectedUri = vscode.Uri.file('/global/file1');
    const rawDatastore: RawDatastore = {
      get: () => Object.fromEntries([[expectedUri, {}]]),
      setAsync: () => {
        assert.fail('Unexpected call');
      },
    };
    const datastore = new Datastore(rawDatastore);

    assert.strictEqual(
      await datastore.replaceAsync(
        vscode.Uri.file('/global/file2'),
        vscode.Uri.file('/global/file3'),
      ),
      undefined,
    );
  });

  test('upgradeAsync ', async () => {
    const rawDatastore: RawDatastore = {
      get: () => {
        assert.fail('Unexpected call');
      },
      setAsync: () => {
        assert.fail('Unexpected call');
      },
    };
    const datastore = new Datastore(rawDatastore);
    assert.strictEqual(await datastore.upgradeAsync(), false);
  });
});
