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
  public readonly kind: BookmarkKind;
  public readonly name: string;

  constructor(name: string, kind: BookmarkKind, memento: vscode.Memento) {
    this.datastore = new BookmarkDatastore(memento);
    this.kind = kind;
    this.name = name;
  }

  /**
   * Add bookmarks.
   * @return Added bookmarks,
   */
  public async addBookmarksAsync(uris: vscode.Uri[]): Promise<Bookmark[]> {
    const addedBookmarks: Bookmark[] = [];
    const bookmarks = this.datastore.get();

    for (const uri of uris) {
      const uriStr = uri.toString();
      if (!(uriStr in bookmarks)) {
        bookmarks[uriStr] = {};
        addedBookmarks.push(new Bookmark(uri, this.kind));
      }
    }

    if (addedBookmarks.length) {
      await this.datastore.updateAsync(bookmarks);
    }
    return addedBookmarks;
  }

  /**
   * Number of bookmarks in group.
   */
  public getBookmarkCount(): number {
    const bookmarks = this.datastore.get();
    return Object.keys(bookmarks).length;
  }

  /**
   * Checks if `uri` is part of current group (exact match only).
   */
  public contains(uri: vscode.Uri): boolean {
    const uriStr = uri.toString();
    const bookmarks = this.datastore.get();
    return (uriStr in bookmarks);
  }

  /**
   * Get all {@link Bookmark} bookmarks associated with `uri`.
   */
  public getBookmark(uri: vscode.Uri): Bookmark | undefined {
    const bookmarks = this.datastore.get();
    const bookmarkData = bookmarks[uri.toString()]; //TODO: use metadata
    return bookmarkData ? new Bookmark(uri, this.kind) : undefined;
  }

  /**
   * Get all {@link Bookmark} bookmarks.
   */
  public getBookmarks(): Bookmark[] {
    const bookmarks = this.datastore.get();
    //TODO: use metadata
    return Object.entries(bookmarks)
      .map(([uriStr, _bookmarkData]) => new Bookmark(vscode.Uri.parse(uriStr), this.kind));
  }

  /**
   * Remove bookmarks.
   */
  public async removeBookmarksAsync(bookmarks: Bookmark[]): Promise<Bookmark[]> {
    const removedBookmarks: Bookmark[] = [];
    const loadedBookmarks = this.datastore.get();

    for (const bookmark of bookmarks) {
      const uriStr = bookmark.uri.toString();
      if (uriStr in loadedBookmarks) {
        delete loadedBookmarks[uriStr];
        removedBookmarks.push(bookmark);
      }
    }

    if (removedBookmarks.length) {
      await this.datastore.updateAsync(loadedBookmarks);
    }
    return removedBookmarks;
  }

  /**
   * Remove all bookmarks.
   */
  public async removeAllBookmarksAsync(): Promise<Bookmark[]> {
    const removedBookmarks: Bookmark[] = this.getBookmarks();
    await this.datastore.updateAsync();
    return removedBookmarks;
  }
}