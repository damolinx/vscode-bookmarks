import * as vscode from 'vscode';

/**
 * URI scheme used for containers after v0.3.7.
 */
export const CONTAINER_SCHEME = 'container';

/**
 * Metadata format (used from v0.3.0).
 * - {@link RawData} was added after v0.3.3 to support nesting.
 */
export interface RawMetadata { [key: string]: string | RawData | undefined }

/**
 * Data format (used from v0.3.1).
 */
export interface RawData { [uri: string]: RawMetadata | undefined }

/**
 * Basic datastore for {@link RawData} data.
 */
export interface RawDatastore {
  /**
   * Gets the store state. `undefined` means there is no saved state.
   */
  get(): undefined | RawData;

  /**
   * Sets the store state. Using `undefined` as `state` clears any stored state.
   * @param state Store state. MUST NOT contain cyclic references.
   */
  setAsync(state?: RawData): void | Thenable<void>;
}

/**
 * This class represents a datastore with appropriate semantics to handle extension data,
 * which contrasts with {@link RawDatastore} which does not enforce any particular rules.
 * The abstraction allows use any arbitrary datastore while enforcing necessary rules.
 */
export class Datastore<TStore extends RawDatastore = RawDatastore> {
  public readonly rawStore: TStore;

  /**
   * Constructor.
   * @param rawStore Raw datastore.
   */
  constructor(rawStore: TStore) {
    this.rawStore = rawStore;
  }

  /**
   * Add new entries.
   * @param entries Entries to add.
   * @param override Allow overriding a matching entry, otherwise ignore.
   * @returns List of added URIs (no duplicates).
   */
  public async addAsync(
    entries: { uri: vscode.Uri; metadata?: RawMetadata }[],
    override = false,
  ): Promise<vscode.Uri[]> {
    const addedUris: vscode.Uri[] = [];
    const existingEntries = this.getAll();

    for (const { uri, metadata } of entries) {
      const uriStr = uri.toString();
      if (override || !(uriStr in existingEntries)) {
        existingEntries[uriStr] = metadata || {};
        addedUris.push(uri);
      }
    }

    if (addedUris.length) {
      await this.rawStore.setAsync(existingEntries);
    }
    return addedUris;
  }

  /**
   * Checks if `uri` exists in the datastore.
   * @param uri URI to test (line data is significant).
   */
  public contains(uri: vscode.Uri): boolean {
    const existingEntries = this.getAll();
    return uri.toString() in existingEntries;
  }

  /**
   * Number of entries in the datastore.
   */
  public get count(): number {
    const existingEntries = this.getAll();
    return Object.keys(existingEntries).length;
  }

  /**
   * Get metadata associated with `uri`.
   * @param uri URI to search for (line data is significant).
   * @return Metadata, if found.
   */
  public getMetadata(uri: vscode.Uri): RawMetadata | undefined {
    const existingEntries = this.getAll();
    return existingEntries[uri.toString()];
  }

  /**
   * Get all data.
   * @return Stored data.
   */
  public getAll(): RawData {
    return this.rawStore.get() || {};
  }

  /**
   * Remove all data associated with `uris`.
   * @param uris URIs to remove (line data is significant).
   * @returns List of removed URIs (no duplicates).
   */
  public async removeAsync(uris: vscode.Uri | Iterable<vscode.Uri>): Promise<vscode.Uri[]> {
    const removedUris: vscode.Uri[] = [];
    const existingEntries = this.getAll();

    const iterableUris = uris instanceof vscode.Uri ? [uris] : uris;
    for (const uri of iterableUris) {
      const uriStr = uri.toString();
      if (uriStr in existingEntries) {
        delete existingEntries[uriStr];
        removedUris.push(uri);
      }
    }

    if (removedUris.length) {
      await this.rawStore.setAsync(existingEntries);
    }
    return removedUris;
  }

  /**
   * Remove all data.
   */
  public async removeAllAsync(): Promise<void> {
    await this.rawStore.setAsync(undefined);
  }

  /**
   * Replace `uri` with `replaceUri` in a single operation. If `uri` is not found,
   * no changes are made.
   * @param uri Source URI.
   * @param newUri Target URI.
   * @returns Metadata that was associated with `replaceUri`, if `uri` was found.
   */
  public async replaceAsync(
    uri: vscode.Uri,
    newUri: vscode.Uri,
  ): Promise<RawMetadata | undefined> {
    const existingEntries = this.getAll();
    const uriStr = uri.toString();
    const metadata = existingEntries[uriStr];

    if (metadata) {
      existingEntries[newUri.toString()] = metadata;
      delete existingEntries[uriStr];
      await this.rawStore.setAsync(existingEntries);
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
