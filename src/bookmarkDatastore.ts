import { Memento, Uri } from 'vscode';

/**
 * Data format used up to v0.2.1.
 */
export const V0_MEMENTO_KEY_NAME = "bookmarks";
export type V0_STORE_TYPE = string[];

/**
 * Data format used from v0.3.0.
 */
export const V1_MEMENTO_KEY_NAME = "bookmarks.v1";
export type V1_BOOKMARK_METADATA = { [key: string]: string };
export type V1_STORE_TYPE = { [uri: string]: V1_BOOKMARK_METADATA };

export class BookmarkDatastore {
  private readonly memento: Memento;

  constructor(memento: Memento) {
    this.memento = memento;
  }

  /**
   * Add bookmarks.
   */
  public async addAsync(...entries: { uri: Uri, metadata: V1_BOOKMARK_METADATA }[]): Promise<Uri[]> {
    const bookmarks = this.getAll();
    const addedUris: Uri[] = [];

    for (const { uri, metadata } of entries) {
      const uriStr = uri.toString();
      if (!(uriStr in bookmarks)) {
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
   */
  public contains(uri: Uri): boolean {
    const bookmarks = this.getAll();
    return (uri.toString() in bookmarks);
  }

  /**
   * Number of items.
   */
  public count(): number {
    const bookmarks = this.getAll();
    return Object.keys(bookmarks).length;
  }

  /**
   * Return bookmark data.
   * @param uri URI to search for (line data is significant).
   * @return Bookmark metadata if URL is present.
   */
  public get(uri: Uri): V1_BOOKMARK_METADATA | undefined {
    const bookmarks = this.getAll();
    return bookmarks[uri.toString()];
  }

  /**
   * Return all bookmark data.
   * @param defaultValue A value to return when there is no bookmark data.
   * @return The stored or `defaultValue` value.
   */
  public getAll(defaultValue: V1_STORE_TYPE = {}): V1_STORE_TYPE {
    return this.memento.get(V1_MEMENTO_KEY_NAME, defaultValue);
  }

  /**
   * Remove bookmarks.
   */
  public async removeAsync(...uris: Uri[]): Promise<Uri[]> {
    const bookmarks = this.getAll();
    const removedUris: Uri[] = [];

    for (const uri of uris) {
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
   * Updates bookmarks.
   */
  public async updateAsync(...entries: { uri: Uri, metadata: V1_BOOKMARK_METADATA }[]): Promise<Uri[]> {
    const bookmarks = this.getAll();
    const updatedUris: Uri[] = [];

    for (const { uri, metadata } of entries) {
      bookmarks[uri.toString()] = metadata;
      updatedUris.push(uri);
    }

    await this.memento.update(V1_MEMENTO_KEY_NAME, bookmarks);
    return updatedUris;
  }

  /**
   * Upgrade data store.
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