import * as vscode from 'vscode';
import * as assert from 'assert';
import { basename } from 'path';

import {
  MementoDatastore,
  V0_MEMENTO_KEY_NAME,
  V1StoreType,
  V1_MEMENTO_KEY_NAME,
} from '../../../datastore/mementoDatastore';
import { CONTAINER_SCHEME } from '../../../datastore/datastore';

suite(`Suite: ${basename(__filename, '.test.js')}`, () => {
  let restorables: { restore: () => void }[];

  setup(() => {
    restorables = [];
  });

  teardown(() => restorables.forEach((r) => r.restore()));

  test('upgradeAsync (no upgrade)', async () => {
    const memento: vscode.Memento = {
      get<T>(key: string, defaultValue: T) {
        switch (key) {
          case V0_MEMENTO_KEY_NAME:
            assert.strictEqual(defaultValue, undefined);
            break;
          case V1_MEMENTO_KEY_NAME:
            assert.deepStrictEqual(defaultValue, {});
            break;
          default:
            assert.fail(`Unexpected key: ${key}`);
        }
        return defaultValue;
      },
    } as any;
    const datastore = new MementoDatastore(memento);
    assert.strictEqual(await datastore.upgradeAsync(), false);
  });

  test('upgradeAsync (upgrade, v1 does not exist)', async () => {
    const expectedUri1 = 'file:///workspace/test1.txt';
    const expectedUri2 = 'file:///workspace/folder/test2.txt#L10';
    const expectedV1: V1StoreType = {};
    expectedV1[`${expectedUri1}#L1`] = {};
    expectedV1[expectedUri2] = {};

    const memento: vscode.Memento = {
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
        }
      },
    } as any;

    const datastore = new MementoDatastore(memento);
    assert.strictEqual(await datastore.upgradeAsync(), true);
  });

  test('upgradeAsync (upgrade, v1 already exists)', async () => {
    const expectedUri1 = 'file:///workspace/test1.txt';
    const expectedUri2 = 'file:///workspace/folder/test2.txt#L10';
    const existingContainerUri = `${CONTAINER_SCHEME}:folder1`;

    const existingV1: V1StoreType = {};
    existingV1[expectedUri2] = {
      foo: 'bar',
    };
    existingV1[existingContainerUri] = {};

    const expectedV1: V1StoreType = {};
    expectedV1[`${expectedUri1}#L1`] = {};
    expectedV1[expectedUri2] = existingV1[expectedUri2];
    expectedV1[existingContainerUri] = existingV1[existingContainerUri];

    const memento: vscode.Memento = {
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
        }
      },
    } as any;

    const datastore = new MementoDatastore(memento);
    assert.strictEqual(await datastore.upgradeAsync(), true);
  });
});
