import * as vscode from 'vscode';
import * as assert from 'assert';
import { V1_MEMENTO_KEY_NAME } from '../../../datastore/mementoDatastore';

export function createMockMemento(...uris: string[]): vscode.Memento {
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
    },
  };
}
