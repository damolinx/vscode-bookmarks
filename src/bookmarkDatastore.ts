import * as vscode from 'vscode';

/**
 * Memento key name used up to v0.2.1.
 */
export const V0_MEMENTO_KEY_NAME = "bookmarks";
/**
 * Data format used up to v0.2.1.
 */
export type V0_STORE_TYPE = string[];

/**
 * Memento key name used from v0.3.0.
 */
export const V1_MEMENTO_KEY_NAME = "bookmarks.v1";
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
export class BookmarkDatastore {
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
   * @returns List of added bookmarks, no duplicates.
   */
  public async addAsync(entries: (vscode.Uri | [vscode.Uri, V1_BOOKMARK_METADATA])[], override: boolean = false): Promise<[vscode.Uri, V1_BOOKMARK_METADATA][]> {
    const addedData: [vscode.Uri, V1_BOOKMARK_METADATA][] = [];
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
        addedData.push([uri, metadata]);
      }
    }

    if (addedData.length) {
      await this.memento.update(V1_MEMENTO_KEY_NAME, bookmarks);
    }
    return addedData;
  }

  /**
   * Checks if `uri` is bookmarked.
   * @param uri URI to test (line data is significant).
   */
  public contains(uri: vscode.Uri): boolean {
    const bookmarks = this.getAll();
    return (uri.toString() in bookmarks);
  }

  /**
   * Number of bookmark entries.
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

    const iterableUris = (uris instanceof vscode.Uri) ? [uris] : uris;
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
   * Replace `uri` with `replaceUri` in a single operation.
   * @param uri URI to search for.
   * @param replaceUri URI to replace with.
   * @param replaceMetadata Metadata to use in replacement. If not provided, 
   * existing metadata associated with `uri` is used, and in that case, if 
   * `uri` is not found, empty metadata is stored instead.
   * @returns Metadata that was associated with `replaceUri`.
   */
  public async replaceAsync(uri: vscode.Uri, replaceUri: vscode.Uri, replaceMetadata?: V1_BOOKMARK_METADATA): Promise<V1_BOOKMARK_METADATA> {
    const bookmarks = this.getAll();
    const metadata = replaceMetadata ?? bookmarks[uri.toString()] ?? {};

    delete bookmarks[uri.toString()];
    bookmarks[replaceUri.toString()] = metadata;

    await this.memento.update(V1_MEMENTO_KEY_NAME, bookmarks);
    return metadata;
  }

  /**
   * Upgrade datastore.
   */
  public async upgradeAsync(): Promise<boolean> {
    const v0 = this.memento.get<V0_STORE_TYPE>(V0_MEMENTO_KEY_NAME);
    if (!v0) {
      return false;
    }

    // Try to load v1 first to address edge case of multiple VSCode instances
    // running and an upgrade has already happened. Likewise, do not override
    // existing data as it will be either empty or contain new data that this
    // upgrade run would not know about.
    const v1 = this.memento.get<V1_STORE_TYPE>(V1_MEMENTO_KEY_NAME, {});
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