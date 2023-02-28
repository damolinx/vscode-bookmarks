import * as vscode from 'vscode';

/**
 * Bookmark metadata format.
 */
export type BOOKMARK_METADATA_TYPE = V1_BOOKMARK_METADATA_TYPE;

/**
 * Bookmark data format.
 */
export type STORE_TYPE = V1_STORE_TYPE;

/**
 * Data format used up to v0.2.1.
 */
export type V0_STORE_TYPE = string[];

/**
 * Metadata format used from v0.3.0.
 */
export type V1_BOOKMARK_METADATA_TYPE = { [key: string]: string };
/**
 * Data format used from v0.3.0.
 */
export type V1_STORE_TYPE = { [uri: string]: V1_BOOKMARK_METADATA_TYPE };

/**
 * This class uses a {@link vscode.Memento} as backing store for
 * bookmark data.
 */
export interface Datastore<TSTORE = STORE_TYPE, TMETADATA = BOOKMARK_METADATA_TYPE> {
  /**
   * Add bookmarks.
   * @param entries Bookmarks to add.
   * @returns List of added URIs, no duplicates.
   */
  addAsync(entries: (vscode.Uri | [vscode.Uri, TMETADATA])[]): Promise<vscode.Uri[]>;

  /**
   * Add bookmarks.
   * @param entries Bookmarks to add.
   * @param override Allow overriding a matching bookmark definition, otherwise ignore.
   * @returns List of added URIs, no duplicates.
   */
  addAsync(
    entries: (vscode.Uri | [vscode.Uri, TMETADATA])[],
    override: boolean
  ): Promise<vscode.Uri[]>;

  /**
   * Checks if `uri` is bookmarked.
   * @param uri URI to test (line data is significant).
   */
  contains(uri: vscode.Uri): boolean;

  /**
   * Number of bookmarks in the store.
   */
  get count(): number;

  /**
   * Get bookmark metadata associated with `uri`.
   * @param uri URI to search for (line data is significant).
   * @return Metadata, if found.
   */
  get(uri: vscode.Uri): TMETADATA | undefined;

  /**
   * Return all bookmark data.
   * @return Stored data.
   */
  getAll(): TSTORE;

  /**
   * Remove bookmarks.
   * @param uris URIs to search for (line data is significant).
   * @returns List of removed bookmarks, no duplicates.
   */
  removeAsync(uris: vscode.Uri | Iterable<vscode.Uri>): Promise<vscode.Uri[]>;

  /**
   * Remove all bookmarks.
   */
  removeAllAsync(): Promise<void>;

  /**
   * Replace `uri` with `replaceUri` in a single operation. If `uri` is not found,
   * no chnages are made.
   * @param uri Source URI.
   * @param newUri Target URI.
   * @returns Metadata that was associated with `replaceUri`, if `uri` was found.
   */
  replaceAsync(uri: vscode.Uri, newUri: vscode.Uri): Promise<TMETADATA | undefined>;

  /**
   * Upgrade datastore.
   */
  upgradeAsync(): Promise<boolean>;
}
