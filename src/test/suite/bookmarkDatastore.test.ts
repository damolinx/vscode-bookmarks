import * as assert from 'assert';
import { basename } from 'path';
import { Memento, Uri } from 'vscode';
import {
  BookmarkDatastore,
  V0_MEMENTO_KEY_NAME,
  V1_MEMENTO_KEY_NAME,
  V1_STORE_TYPE
} from '../../bookmarkDatastore';

suite(`Suite: ${basename(__filename, '.test.js')}`, () => {
  let restorables: Array<{ restore: () => void }>;

  setup(() => {
    restorables = [];
  });

  teardown(() => restorables.forEach((r) => r.restore()));

  test('addAsync: non-existing', async () => {
    const expectedUri = Uri.parse("file://global/file3");
    const mementoMock: Memento = createMockMemento(
      "file://global/file1", "file://global/file2");
    const datastore = new BookmarkDatastore(mementoMock);
    assert.deepStrictEqual(
      await datastore.addAsync({ uri: expectedUri, metadata: {} }),
      [expectedUri]);
  });

  test('addAsync: existing', async () => {
    const expectedUri = Uri.parse("file://global/file3");
    const mementoMock: Memento = createMockMemento(
      "file://global/file1", "file://global/file2", expectedUri.toString());
    const datastore = new BookmarkDatastore(mementoMock);
    assert.deepStrictEqual(
      await datastore.addAsync({ uri: expectedUri, metadata: {} }),
      []);
  });

  test('contains: empty', () => {
    const mementoMock: Memento = createMockMemento();
    const datastore = new BookmarkDatastore(mementoMock);
    assert.strictEqual(datastore.contains(Uri.parse("file://global/file1")), false);
  });

  test('contains: existing', () => {
    const expectedUri = Uri.parse("file://global/file3");
    const mementoMock: Memento = createMockMemento(
      "file://global/file1", "file://global/file2", expectedUri.toString());
    const datastore = new BookmarkDatastore(mementoMock);
    assert.strictEqual(datastore.contains(expectedUri), true);
  });

  test('contains: non-existing', () => {
    const mementoMock: Memento = createMockMemento(
      "file://global/file1", "file://global/file2");
    const datastore = new BookmarkDatastore(mementoMock);
    assert.strictEqual(datastore.contains(Uri.parse("file://global/file3")), false);
  });

  test('count: empty', () => {
    const mementoMock: Memento = createMockMemento();
    const datastore = new BookmarkDatastore(mementoMock);
    assert.strictEqual(datastore.count(), 0);
  });

  test('count: existing', () => {
    const expectedUris = ["file://global/file1", "file://global/file2"];
    const mementoMock: Memento = createMockMemento(...expectedUris);
    const datastore = new BookmarkDatastore(mementoMock);
    assert.strictEqual(datastore.count(), expectedUris.length);
  });

  test('get: non-existing', () => {
    const mementoMock: Memento = createMockMemento(
      "file://global/file1", "file://global/file2");
    const datastore = new BookmarkDatastore(mementoMock);
    assert.strictEqual(datastore.get(Uri.parse("file://global/file3")), undefined);
  });

  test('get: existing', () => {
    const expectedUri = Uri.parse("file://global/file3");
    const mementoMock: Memento = createMockMemento(
      "file://global/file1", "file://global/file2", expectedUri.toString());
    const datastore = new BookmarkDatastore(mementoMock);
    assert.deepStrictEqual(datastore.get(expectedUri), {});
  });

  test('getAll: empty', () => {
    const mementoMock: Memento = createMockMemento();
    const datastore = new BookmarkDatastore(mementoMock);
    assert.deepStrictEqual(datastore.getAll(), {});
  });

  test('getAll: existing', () => {
    const expectedUris = ["file://global/file1", "file://global/file2"];
    const mementoMock: Memento = createMockMemento(...expectedUris);
    const datastore = new BookmarkDatastore(mementoMock);
    assert.deepStrictEqual(
      datastore.getAll(),
      Object.fromEntries(expectedUris.map((uri) => [uri, {}])));
  });

  test('removeAsync: non-existing', async () => {
    const mementoMock: Memento = createMockMemento(
      "file://global/file1", "file://global/file2");
    const datastore = new BookmarkDatastore(mementoMock);
    assert.deepStrictEqual(
      await datastore.removeAsync(Uri.parse("file://global/file3")),
      []);
  });

  test('removeAsync: non-existing', async () => {
    const mementoMock: Memento = createMockMemento(
      "file://global/file1", "file://global/file2");
    const datastore = new BookmarkDatastore(mementoMock);
    assert.deepStrictEqual(
      await datastore.removeAsync(Uri.parse("file://global/file3")),
      []);
  });

  test('removeAsync: existing', async () => {
    const expectedUri = Uri.parse("file://global/file3");
    const mementoMock: Memento = createMockMemento(
      "file://global/file1", "file://global/file2", expectedUri.toString());
    const datastore = new BookmarkDatastore(mementoMock);
    assert.deepStrictEqual(
      await datastore.removeAsync(expectedUri),
      [expectedUri]);
  });

  test('upgradeAsync (no upgrade)', async () => {
    const mementoMock: Memento = <any>{
      get<T>(key: string, defaultValue: T) {
        assert.strictEqual(key, V0_MEMENTO_KEY_NAME);
        assert.strictEqual(defaultValue, undefined);
        return;
      },
    };
    const datastore = new BookmarkDatastore(mementoMock);
    assert.strictEqual(await datastore.upgradeAsync(), false);
  });

  test('upgradeAsync (upgrade, v1 does not exist)', async () => {
    const expectedUri1 = 'file:///workspace/test1.txt';
    const expectedUri2 = 'file:///workspace/folder/test2.txt#L10';
    const expectedV1: V1_STORE_TYPE = {};
    expectedV1[expectedUri1] = {};
    expectedV1[expectedUri2] = {};

    const mementoMock: Memento = <any>{
      get<T>(key: string, defaultValue: T) {
        switch (key) {
          case V0_MEMENTO_KEY_NAME:
            assert.strictEqual(defaultValue, undefined);
            return [expectedUri1, expectedUri2];
          case V1_MEMENTO_KEY_NAME:
            assert.deepStrictEqual(defaultValue, {});
            return defaultValue;
          default:
            assert.fail(`Unexpected key: ${key}`);
            break;
        }
      },
      async update(key: string, value: any): Promise<void> {
        switch (key) {
          case V0_MEMENTO_KEY_NAME:
            assert.strictEqual(value, undefined);
            break;
          case V1_MEMENTO_KEY_NAME:
            assert.deepStrictEqual(value, expectedV1);
            break;
          default:
            assert.fail(`Unexpected key: ${key}`);
            break;
        }
      }
    };

    const datastore = new BookmarkDatastore(mementoMock);
    assert.strictEqual(await datastore.upgradeAsync(), true);
  });

  test('upgradeAsync (upgrade, v1 already exists)', async () => {
    const expectedUri1 = 'file:///workspace/test1.txt';
    const expectedUri2 = 'file:///workspace/folder/test2.txt#L10';
    const existingV1: V1_STORE_TYPE = {};
    existingV1[expectedUri2] = {
      'foo': 'bar'
    };
    const expectedV1: V1_STORE_TYPE = {};
    expectedV1[expectedUri1] = {};
    expectedV1[expectedUri2] = existingV1[expectedUri2];

    const mementoMock: Memento = <any>{
      get<T>(key: string, defaultValue: T) {
        switch (key) {
          case V0_MEMENTO_KEY_NAME:
            assert.strictEqual(defaultValue, undefined);
            return [expectedUri1, expectedUri2];
          case V1_MEMENTO_KEY_NAME:
            assert.deepStrictEqual(defaultValue, {});
            return existingV1;
          default:
            assert.fail(`Unexpected key: ${key}`);
            break;
        }
      },
      async update(key: string, value: any): Promise<void> {
        switch (key) {
          case V0_MEMENTO_KEY_NAME:
            assert.strictEqual(value, undefined);
            break;
          case V1_MEMENTO_KEY_NAME:
            assert.deepStrictEqual(value, expectedV1);
            break;
          default:
            assert.fail(`Unexpected key: ${key}`);
            break;
        }
      }
    };

    const datastore = new BookmarkDatastore(mementoMock);
    assert.strictEqual(await datastore.upgradeAsync(), true);
  });
});

function createMockMemento(...uris: string[]): Memento {
  let store = Object.fromEntries(uris.map((uri) => [uri, {}]));
  return <any>{
    get<T>(key: string, defaultValue: T) {
      assert.strictEqual(key, V1_MEMENTO_KEY_NAME);
      return store ?? defaultValue;
    },
    update(key: string, value: any): Promise<void> {
      assert.strictEqual(key, V1_MEMENTO_KEY_NAME);
      store = value;
      return Promise.resolve();
    }
  };
}