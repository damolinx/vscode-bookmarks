import * as vscode from 'vscode';
import { Datastore } from './datastore/datastore';
import { Bookmark, BookmarkKind } from './bookmark';

/**
 * Bookmark datastore.
 */
export class BookmarkDatastore {
  private readonly datastore: Datastore;

  /**
   * Datastore associated kind.
   */
  public readonly kind: BookmarkKind;

  /**
   * Constructor.
   * @param kind Bookmark kind associated with store.
   * @param datastore Raw datastore.
   */
  constructor(kind: BookmarkKind, datastore: Datastore) {
    this.datastore = datastore;
    this.kind = kind;
  }

  /**
   * Add bookmarks. If a bookmark with the same {@link Bookmark.uri} is already
   * present, it is skipped which means first-one-wins in case of duplicates.
   * @param bookmarks Bookmarks to add.
   * @return Added bookmarks (no duplicates).
   */
  public async addAsync(...bookmarks: Bookmark[]): Promise<Bookmark[]> {
    const added = await this.datastore.addAsync(
      bookmarks.map((b) => ({ uri: b.uri, metadata: b.metadata }))
    );
    const addedBookmarks = bookmarks.filter((b) => added.includes(b.uri));
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
   * @returns {@link Bookmark} instance, if found.
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
   * @param bookmarks Bookmarks to remove.
   * @return Removed bookmarks (no duplicates).
   */
  public async removeAsync(...bookmarks: Bookmark[]): Promise<Bookmark[]> {
    const removed = await this.datastore.removeAsync(bookmarks.map((b) => b.uri));
    const removedBookmarks = bookmarks.filter((b) => removed.includes(b.uri));
    return removedBookmarks;
  }

  /**
   * Remove bookmarks by URI.
   * @param uris URIs to remove (line-number is significant).
   * @return Removed bookmarks (no duplicates).
   */
  public async removeByUriAsync(...uris: vscode.Uri[]): Promise<vscode.Uri[]> {
    const removed = await this.datastore.removeAsync(uris);
    const removedUris = uris.filter((uri) => removed.includes(uri));
    return removedUris;
  }

  /**
   * Upsert bookmarks. Last-one-wins in case of duplicates.
   * @param bookmarks Bookmark to upsert.
   * @return Upserted bookmarks (no duplicates).
   */
  public async upsert(...bookmarks: Bookmark[]): Promise<Bookmark[]> {
    const upserted = await this.datastore.addAsync(
      bookmarks.map((b) => ({ uri: b.uri, metadata: b.metadata })),
      true /* override */
    );
    const upsertedBookmarks = bookmarks.filter((b) => upserted.includes(b.uri));
    return upsertedBookmarks;
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
