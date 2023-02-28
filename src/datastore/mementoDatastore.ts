import * as vscode from 'vscode';

/**
 * Memento key name used up to v0.2.1.
 */
export const V0_MEMENTO_KEY_NAME = 'bookmarks';
/**
 * Data format used up to v0.2.1.
 */
export type V0_STORE_TYPE = string[];

/**
 * Memento key name used from v0.3.0.
 */
export const V1_MEMENTO_KEY_NAME = 'bookmarks.v1';
/**
 * Metadata format used from v0.3.0.
 */
export type V1_BOOKMARK_METADATA = { [key: string]: string };
/**
 * Data format used from v0.3.0.
 */
export type V1_STORE_TYPE = { [uri: string]: V1_BOOKMARK_METADATA };

/**
 * This class uses a {@link vscode.Memento} as backing store for
 * bookmark data.
 */
export class MementoDatastore {
  private readonly memento: vscode.Memento;

  /**
   * Constructor.
   * @param memento Data store.
   */
  constructor(memento: vscode.Memento) {
    this.memento = memento;
  }

  /**
   * Add bookmarks.
   * @param entries Bookmarks to add.
   * @param override Allow overriding a matching bookmark definition, otherwise ignore.
   * @returns List of added URIs, no duplicates.
   */
  public async addAsync(
    entries: (vscode.Uri | [vscode.Uri, V1_BOOKMARK_METADATA])[],
    override: boolean = false
  ): Promise<vscode.Uri[]> {
    const addedUris: vscode.Uri[] = [];
    const bookmarks = this.getAll();

    for (const entry of entries) {
      let uri: vscode.Uri;
      let metadata: V1_BOOKMARK_METADATA;

      if (entry instanceof vscode.Uri) {
        uri = entry;
        metadata = {};
      } else {
        [uri, metadata] = entry;
      }

      const uriStr = uri.toString();
      if (override || !(uriStr in bookmarks)) {
        bookmarks[uriStr] = metadata;
        addedUris.push(uri);
      }
    }

    if (addedUris.length) {
      await this.memento.update(V1_MEMENTO_KEY_NAME, bookmarks);
    }
    return addedUris;
  }

  /**
   * Checks if `uri` is bookmarked.
   * @param uri URI to test (line data is significant).
   */
  public contains(uri: vscode.Uri): boolean {
    const bookmarks = this.getAll();
    return uri.toString() in bookmarks;
  }

  /**
   * Number of bookmarks in the store.
   */
  public get count(): number {
    const bookmarks = this.getAll();
    return Object.keys(bookmarks).length;
  }

  /**
   * Get bookmark metadata associated with `uri`.
   * @param uri URI to search for (line data is significant).
   * @return Metadata, if found.
   */
  public get(uri: vscode.Uri): V1_BOOKMARK_METADATA | undefined {
    const bookmarks = this.getAll();
    return bookmarks[uri.toString()];
  }

  /**
   * Return all bookmark data.
   * @return Stored data.
   */
  public getAll(): V1_STORE_TYPE {
    return this.memento.get<V1_STORE_TYPE>(V1_MEMENTO_KEY_NAME, {});
  }

  /**
   * Remove bookmarks.
   * @param uris URIs to search for (line data is significant).
   * @returns List of removed bookmarks, no duplicates.
   */
  public async removeAsync(uris: vscode.Uri | Iterable<vscode.Uri>): Promise<vscode.Uri[]> {
    const removedUris: vscode.Uri[] = [];
    const bookmarks = this.getAll();

    const iterableUris = uris instanceof vscode.Uri ? [uris] : uris;
    for (const uri of iterableUris) {
      const uriStr = uri.toString();
      if (uriStr in bookmarks) {
        delete bookmarks[uriStr];
        removedUris.push(uri);
      }
    }

    if (removedUris.length) {
      await this.memento.update(V1_MEMENTO_KEY_NAME, bookmarks);
    }
    return removedUris;
  }

  /**
   * Remove all bookmarks.
   */
  public async removeAllAsync(): Promise<void> {
    await this.memento.update(V1_MEMENTO_KEY_NAME, undefined);
  }

  /**
   * Replace `uri` with `replaceUri` in a single operation. If `uri` is not found,
   * no chnages are made.
   * @param uri Source URI.
   * @param newUri Target URI.
   * @returns Metadata that was associated with `replaceUri`, if `uri` was found.
   */
  public async replaceAsync(
    uri: vscode.Uri,
    newUri: vscode.Uri
  ): Promise<V1_BOOKMARK_METADATA | undefined> {
    const bookmarks = this.getAll();
    const uriStr = uri.toString();

    let metadata: V1_BOOKMARK_METADATA | undefined = bookmarks[uriStr];

    if (metadata) {
      bookmarks[newUri.toString()] = metadata;
      delete bookmarks[uriStr];
      await this.memento.update(V1_MEMENTO_KEY_NAME, bookmarks);
    }

    return metadata;
  }

  /**
   * Upgrade datastore.
   */
  public async upgradeAsync(): Promise<boolean> {
    const tasks: Thenable<void>[] = [];
    const v1 = this.memento.get<V1_STORE_TYPE>(V1_MEMENTO_KEY_NAME, {});
    let saveV1 = false;

    // V0 upgrade
    const v0 = this.memento.get<V0_STORE_TYPE>(V0_MEMENTO_KEY_NAME);
    if (v0) {
      // Only copy URLs from v0 to v1 if they are not present already. If they
      // are present, upgrade has already happened perhaps on the edge case of
      // multiple VSCode instances running.
      for (const uri of v0) {
        if (!(uri in v1)) {
          v1[uri] = {};
          saveV1 = true;
        }
      }

      // Delete old store
      tasks.push(this.memento.update(V0_MEMENTO_KEY_NAME, undefined));
    }

    // Fix URLs without line number info (pre-0.3.2)
    Object.keys(v1).forEach((uriStr) => {
      if (!uriStr.includes('#')) {
        v1[`${uriStr}#L1`] = v1[uriStr];
        delete v1[uriStr];
        saveV1 = true;
      }
    });

    if (saveV1 || tasks.length) {
      await Promise.all([this.memento.update(V1_MEMENTO_KEY_NAME, v1), ...tasks]);
      return true;
    }

    return false;
  }
}
