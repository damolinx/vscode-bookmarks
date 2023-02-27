import * as vscode from 'vscode';
import { Bookmark, BookmarkKind, DEFAULT_LINE_NUMBER } from './bookmark';
import { BookmarkDatastore, V1_BOOKMARK_METADATA } from './bookmarkDatastore';

export class BookmarkGroup {
  private readonly datastore: BookmarkDatastore;
  public readonly displayName: string;
  public readonly kind: BookmarkKind;

  constructor(name: string, kind: BookmarkKind, memento: vscode.Memento) {
    this.datastore = new BookmarkDatastore(memento);
    this.displayName = name;
    this.kind = kind;
  }

  /**
   * Add bookmarks.
   * @param entries URIs to bookmark.
   * @return Added bookmarks.
   */
  public async addAsync(
    ...entries: vscode.Uri[] | [vscode.Uri, V1_BOOKMARK_METADATA][]
  ): Promise<Bookmark[]> {
    const addedBookmarks: Bookmark[] = [];
    const addedData = await this.datastore.addAsync(entries);
    addedData.forEach(([uri, metadata]) =>
      addedBookmarks.push(new Bookmark(uri, this.kind, metadata))
    );
    return addedBookmarks;
  }

  /**
   * Number of bookmarks in group.
   */
  public get count(): number {
    return this.datastore.count;
  }

  /**
   * Get bookmark associated with `uri`.
   * @param uri URI to search for (line data is significant).
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
  public async removeAllAsync(): Promise<Bookmark[]> {
    const removedBookmarks = this.getAll();
    await this.datastore.removeAllAsync();
    return removedBookmarks;
  }

  /**
   * Remove bookmarks.
   */
  public async removeAsync(bookmarks: Bookmark[]): Promise<Bookmark[]> {
    // Fix-up for DEFAULT_LINE_NUMBER is needed since from v0.3.2 on,
    // all URIs will have a line number, so remote should work for legacy
    const urisToRemove = bookmarks.flatMap((b) => {
      const uris = [b.uri];
      if (b.lineNumber === DEFAULT_LINE_NUMBER) {
        uris.push(b.uri.with({ fragment: '' }));
      }
      return uris;
    });
    const removedUris = await this.datastore.removeAsync(urisToRemove);
    const removedBookmarks = bookmarks.filter((b) => removedUris.includes(b.uri));
    return removedBookmarks;
  }

  /**
   * Update bookmark URI.
   * @param bookmark Bookmark to update.
   * @param newUri URI to replace with.
   */
  public async updateBookmarkUri(bookmark: Bookmark, newUri: vscode.Uri): Promise<void> {
    await this.datastore.replaceAsync(bookmark.uri, newUri, bookmark.metadata);
  }

  /**
   * Update bookmark.
   */
  public async updateAsync(bookmark: Bookmark): Promise<void> {
    await this.datastore.addAsync([[bookmark.uri, bookmark.metadata]], true /* override */);
  }
}
