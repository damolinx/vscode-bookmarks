import * as vscode from 'vscode';
import { Bookmark, BookmarkKind } from './bookmark';
import { BookmarkDatastore } from './bookmarkDatastore';

export function createBookmarkGroup(context: vscode.ExtensionContext, kind: BookmarkKind): BookmarkGroup {
  switch (kind) {
    case 'global':
      return new BookmarkGroup('Global', kind, context.globalState);
    case 'workspace':
      return new BookmarkGroup('Workspace', kind, context.workspaceState);
    default:
      throw new Error(`Unsupported Bookmark kind: ${kind}`);
  }
}

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
   * @param uris URIs to bookmark.
   * @return Added bookmarks.
   */
  public async addAsync(uris: vscode.Uri[]): Promise<Bookmark[]> {
    const addedUris = await this.datastore.addAsync(uris);
    const addedBookmarks = addedUris.map((uri) => new Bookmark(uri, this.kind));
    return addedBookmarks;
  }

  /**
   * Number of bookmarks in group.
   */
  public count(): number {
    return this.datastore.count();
  }

  /**
   * Get bookmark associated with `uri`.
   */
  public get(uri: vscode.Uri): Bookmark | undefined {
    const bookmarkData = this.datastore.get(uri);
    return bookmarkData ? new Bookmark(uri, this.kind, bookmarkData) : undefined;
  }

  /**
   * Get all bookmarks.
   */
  public getAll(): Bookmark[] {
    const bookmarks = this.datastore.getAll();
    return Object.entries(bookmarks)
      .map(([uri, metadata]) => new Bookmark(uri, this.kind, metadata));
  }

  /**
   * Remove all bookmarks.
   */
  public async removeAllAsync(): Promise<Bookmark[]> {
    const removedBookmarks: Bookmark[] = this.getAll();
    await this.datastore.removeAllAsync();
    return removedBookmarks;
  }

  /**
   * Remove bookmarks.
   */
  public async removeAsync(bookmarks: Bookmark[]): Promise<Bookmark[]> {
    const removedUris = await this.datastore.removeAsync(
      bookmarks.map((b) => b.uri));
    return bookmarks.filter(
      (b) => removedUris.includes(b.uri));
  }

  /**
   * Update bookmark.
   */
  public async updateAsync(bookmark: Bookmark): Promise<void> {
    await this.datastore.addAsync(
      [[bookmark.uri, bookmark.metadata]],
      true, /* override */
    );
  }
}