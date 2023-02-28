import * as vscode from 'vscode';
import { MementoDatastore, V1_BOOKMARK_METADATA } from './mementoDatastore';
import { Bookmark, BookmarkKind } from '../bookmark';

/**
 * Bookmark metadata format.
 */
export type BOOKMARK_METADATA = V1_BOOKMARK_METADATA;

/**
 * Bookmark datastore.
 */
export class BookmarkDatastore {
  private readonly datastore: MementoDatastore;
  public readonly kind: BookmarkKind;

  /**
   * Constructor.
   * @param kind Bookmark kind associated with store.
   * @param datastore Raw datastore.
   */
  constructor(kind: BookmarkKind, datastore: MementoDatastore) {
    this.datastore = datastore;
    this.kind = kind;
  }

  /**
   * Add bookmarks. If a bookmark with the same {@link Bookmark.uri} is already
   * present, it is skipped which also first-one-wins in case of duplicates.
   * @param bookmarks Bookmark to add.
   * @return Added bookmarks.
   */
  public async addAsync(...bookmarks: Bookmark[]): Promise<Bookmark[]> {
    const added = await this.datastore.addAsync(bookmarks.map((b) => [b.uri, b.metadata]));
    const addedBookmarks = bookmarks.filter((b) => added.includes(b.uri));
    return addedBookmarks;
  }

  /**
   * Add bookmarks. If a bookmark with the same {@link vscode.Uri} is already
   * present, it is skipped which also first-one-wins in case of duplicates.
   * @param bookmarks Bookmark to add.
   * @param defaultMetadata Metadata for new bookmarks.
   * @return Added bookmarks.
   */
  public async addByUriAsync(
    bookmarks: vscode.Uri[],
    defaultMetadata: BOOKMARK_METADATA = {}
  ): Promise<Bookmark[]> {
    const added = await this.datastore.addAsync(
      bookmarks.map((uri) => [uri, defaultMetadata])
    );
    const addedBookmarks = bookmarks
      .filter((uri) => added.includes(uri))
      .map((uri) => new Bookmark(uri, this.kind, defaultMetadata));
    return addedBookmarks;
  }

  /**
   * Number of bookmarks in the store.
   */
  public get count(): number {
    return this.datastore.count;
  }

  /**
   * Get bookmark associated with `uri`.
   * @param uri URI to search for (line data is significant).
   * @returns Bookmark, if found.
   */
  public get(uri: vscode.Uri): Bookmark | undefined {
    const metadata = this.datastore.get(uri);
    return metadata && new Bookmark(uri, this.kind, metadata);
  }

  /**
   * Get all bookmarks.
   */
  public getAll(): Bookmark[] {
    const bookmarks = this.datastore.getAll();
    return Object.entries(bookmarks).map(
      ([uri, metadata]) => new Bookmark(uri, this.kind, metadata)
    );
  }

  /**
   * Remove all bookmarks.
   */
  public removeAllAsync(): Promise<void> {
    return this.datastore.removeAllAsync();
  }

  /**
   * Remove bookmarks.
   * @param bookmarks Bookmark to remove.
   * @return Removed bookmarks (no duplicates).
   */
  public async removeAsync(...bookmarks: Bookmark[]): Promise<Bookmark[]> {
    const removed = await this.datastore.removeAsync(bookmarks.map((b) => b.uri));
    const removedBookmarks = bookmarks.filter((b) => removed.includes(b.uri));
    return removedBookmarks;
  }

  /**
   * Remove bookmarks by URI (line-number is significant).
   * @param bookmarks Bookmark to remove.
   * @return Removed bookmarks (no duplicates).
   */
  public async removeByUriAsync(...bookmarks: vscode.Uri[]): Promise<vscode.Uri[]> {
    const removed = await this.datastore.removeAsync(bookmarks);
    const removedBookmarks = bookmarks.filter((uri) => removed.includes(uri));
    return removedBookmarks;
  }

  /**
   * Upsert bookmarks. Last-one-wins in case of duplicates.
   * @param bookmarks Bookmark to upsert.
   * @return Upserted bookmarks (no duplicates).
   */
  public async upsert(...bookmarks: Bookmark[]): Promise<Bookmark[]> {
    const added = await this.datastore.addAsync(
      bookmarks.map((b) => [b.uri, b.metadata]),
      true /* override */
    );
    const addedBookmarks = bookmarks.filter((b) => added.includes(b.uri));
    return addedBookmarks;
  }

  /**
   * Update bookmark URI. Ths operation is more efficient than removing and then
   * adding the bookmark, since {@link Bookmark.uri} is its identity.
   * @param uri Source URI.
   * @param newUri Target URI.
   * @returns Updated Bookmark isntance, if `uri` was found and updated.
   */
  public async updateBookmarkUri(
    uri: vscode.Uri,
    newUri: vscode.Uri
  ): Promise<Bookmark | undefined> {
    const metadata = await this.datastore.replaceAsync(uri, newUri);
    return metadata && new Bookmark(uri, this.kind, metadata);
  }

  /**
   * Upgrade datastore.
   */
  public upgradeAsync(): Promise<boolean> {
    return this.datastore.upgradeAsync();
  }
}
