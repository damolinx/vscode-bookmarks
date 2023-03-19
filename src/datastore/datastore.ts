import * as vscode from 'vscode';

/**
 * Bookmark metadata format (used from v0.3.0).
 * - {@link StoreType} was added as after v0.3.3 to support nesting.
 */
export type MetadataType = { [key: string]: string | StoreType | undefined };

/**
 * Bookmark data format (used from v0.3.1).
 */
export type StoreType = { [uri: string]: MetadataType };

/**
 * Basic Datastore for {@link StoreType} data.
 */
export interface RawDatastore {
  /**
   * Gets the store state. `undefined` means there is no saved state.
   */
  get(): undefined | StoreType;

  /**
   * Sets the store state. Using `undefined` as `state` clears any stored state.
   * @param state Store state. MUST NOT contain cyclic references.
   */
  setAsync(state?: StoreType): void | Thenable<void>;
}

/**
 * This class represents a datastore with appropriate restrictions and semantics to handle
 * extension data. This contrasts with the {@link RawDatastore} which caan be anything but
 * it is forced to expose operations that get and set {@link StoreType} data. This allows
 * to use a {@link vscode.Memento} to store data or virtualize individual metadata entries
 * as their own data stores while keeping common data semantics in all cases.
 */
export class Datastore<TSTORE extends RawDatastore = RawDatastore> {
  protected readonly rawStore: TSTORE;

  /**
   * Constructor.
   * @param rawStore Raw datastore.
   */
  constructor(rawStore: TSTORE) {
    this.rawStore = rawStore;
  }

  /**
   * Add bookmarks.
   * @param entries Bookmarks to add.
   * @param override Allow overriding a matching bookmark definition, otherwise ignore.
   * @returns List of added URIs, no duplicates.
   */
  public async addAsync(
    entries: Array<{ uri: vscode.Uri; metadata?: MetadataType }>,
    override: boolean = false
  ): Promise<vscode.Uri[]> {
    const addedUris: vscode.Uri[] = [];
    const bookmarks = this.getAll();

    for (const { uri, metadata } of entries) {
      const uriStr = uri.toString();
      if (override || !(uriStr in bookmarks)) {
        bookmarks[uriStr] = metadata || {};
        addedUris.push(uri);
      }
    }

    if (addedUris.length) {
      await this.rawStore.setAsync(bookmarks);
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
  public get(uri: vscode.Uri): MetadataType | undefined {
    const bookmarks = this.getAll();
    return bookmarks[uri.toString()];
  }

  /**
   * Return all bookmark data.
   * @return Stored data.
   */
  public getAll(): StoreType {
    return this.rawStore.get() || {};
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
      await this.rawStore.setAsync(bookmarks);
    }
    return removedUris;
  }

  /**
   * Remove all bookmarks.
   */
  public async removeAllAsync(): Promise<void> {
    await this.rawStore.setAsync(undefined);
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
  ): Promise<MetadataType | undefined> {
    const bookmarks = this.getAll();
    const uriStr = uri.toString();

    const metadata: MetadataType | undefined = bookmarks[uriStr];
    if (metadata) {
      bookmarks[newUri.toString()] = metadata;
      delete bookmarks[uriStr];
      await this.rawStore.setAsync(bookmarks);
    }

    return metadata;
  }

  /**
   * Upgrade datastore.
   * @returns `true` if any changes were made.
   */
  public async upgradeAsync(): Promise<boolean> {
    return false;
  }
}
