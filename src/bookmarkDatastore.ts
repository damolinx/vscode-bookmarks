import * as vscode from 'vscode';

/**
 * Data format used up to v0.2.1.
 */
export const V0_MEMENTO_KEY_NAME = "bookmarks";
export type V0_TYPE = string[];

/**
 * Data format used from v0.3.0.
 */
export const V1_MEMENTO_KEY_NAME = "bookmarks.v1";
export type V1_TYPE = { [uri: string]: { [key: string]: string } };

export class BookmarkDatastore {
  private readonly memento: vscode.Memento;

  constructor(memento: vscode.Memento) {
    this.memento = memento;
  }

  /**
   * Return bookmark data.
   * @param defaultValue A value to return when there is no bookmark data.
   * @return The stored or `defaultValue` value.
   */
  public get(defaultValue: V1_TYPE = {}): V1_TYPE {
    return this.memento.get(V1_MEMENTO_KEY_NAME, defaultValue);
  }

  /**
   * Store bookmark data. The value must be JSON-stringifyable. Using
   * `undefined` as value removes the key from storage.
   * @param value A value. MUST not contain cyclic references.
   */
  public async updateAsync(value?: V1_TYPE): Promise<void> {
    await this.memento.update(V1_MEMENTO_KEY_NAME, value);
  }

  /**
   * Upgrade data store.
   */
  public async upgradeAsync(): Promise<boolean> {
    const v0 = this.memento.get<V0_TYPE>(V0_MEMENTO_KEY_NAME);
    if (!v0) {
      return false;
    }

    // Try to load v1 first to address edge case of multiple VSCode instances
    // running and an upgrade has already happened. Likewise, do not override
    // existing data as it will be either empty or contain new data that this
    // upgrade run would not know about.
    const v1 = this.memento.get<V1_TYPE>(V1_MEMENTO_KEY_NAME, {});
    for (const uri of v0) {
      if (!(uri in v1)) {
        v1[uri] = {};
      }
    }

    await Promise.all([
      this.memento.update(V0_MEMENTO_KEY_NAME, undefined),
      this.memento.update(V1_MEMENTO_KEY_NAME, v1)
    ]);
    return true;
  }
}