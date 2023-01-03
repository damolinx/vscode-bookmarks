import * as assert from 'assert';
import { basename } from 'path';
import { Memento } from 'vscode';
import { BookmarkDatastore, V0_MEMENTO_KEY_NAME, V1_MEMENTO_KEY_NAME, V1_TYPE } from '../../bookmarkDatastore';

suite(`Suite: ${basename(__filename)}`, () => {
  let restorables: Array<{ restore: () => void }>;

  setup(() => {
    restorables = [];
  });

  teardown(() => restorables.forEach((r) => r.restore()));

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
    const expectedV1: V1_TYPE = {};
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
    const existingV1: V1_TYPE = {};
    existingV1[expectedUri2] = {
      'foo': 'bar'
    };
    const expectedV1: V1_TYPE = {};
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
