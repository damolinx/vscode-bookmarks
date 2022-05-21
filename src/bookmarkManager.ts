import * as vscode from "vscode";
import { Bookmark, BookmarkKind } from "./bookmark";
import { BookmarkGroup, createBookmarkGroup } from "./bookmarkGroup";

export class BookmarkManager implements vscode.Disposable {
  private readonly bookmarkGroups: ReadonlyArray<BookmarkGroup>;
  private readonly onDidAddBookmarkEmitter: vscode.EventEmitter<Bookmark[] | undefined>;
  private readonly onDidRemoveBookmarkEmitter: vscode.EventEmitter<Bookmark[] | undefined>;

  /**
   * Constructor.
   * @param context Context.
   */
  constructor(context: vscode.ExtensionContext) {
    this.bookmarkGroups = [
      createBookmarkGroup(context, 'global'),
      createBookmarkGroup(context, 'workspace')];
    this.onDidAddBookmarkEmitter = new vscode.EventEmitter<Bookmark[] | undefined>();
    this.onDidRemoveBookmarkEmitter = new vscode.EventEmitter<Bookmark[] | undefined>();
  }

  /**
   * Dispose this object.
   */
  public dispose() {
    this.onDidAddBookmarkEmitter.dispose();
    this.onDidRemoveBookmarkEmitter.dispose();
  }

  /**
   * Add bookmark.
   * @param uri URI to bookmark.
   * @param kind Bookmark category.
   * @returns {@link Bookmark} instance, if one was created.
   */
  public async addBookmarkAsync(uri: vscode.Uri, kind: BookmarkKind): Promise<Bookmark | undefined> {
    const addedBookmarks = await this.addBookmarksAsync([uri], kind);
    return addedBookmarks && addedBookmarks[0];
  }

  /**
   * Add bookmarks.
   * @param uris URIs to bookmark. 
   * @param kind Bookmark category.
   * @returns {@link Bookmark} instances that were created.
   */
  public async addBookmarksAsync(uris: vscode.Uri[], kind: BookmarkKind): Promise<Bookmark[] | undefined> {
    const addedBookmarks: Bookmark[] | undefined = (await this.bookmarkGroups
      .find((group) => group.kind === kind)
      ?.addBookmarksAsync(uris));

    if (addedBookmarks?.length) {
      this.onDidAddBookmarkEmitter.fire(addedBookmarks);
    }
    return addedBookmarks;
  }

  /**
   * Get Bookmark, if any.
   * @param uri URI to bookmark.
   * @param kind Bookmark category.
   */
  public getBookmark(uri: vscode.Uri, kind: BookmarkKind): Bookmark | undefined {
    return this.getBookmarkGroup(kind)?.getBookmark(uri);
  }

  /**
   * Get Bookmark group.
   * @param uri URI to bookmark.
   * @param kind Bookmark category.
   */
     public getBookmarkGroup(kind: BookmarkKind): BookmarkGroup | undefined {
      return this.bookmarkGroups
        .find((group) => group.kind === kind);
    }

  /**
   * Get all bookmarks of {@param kind} kind.
   * @param kind Bookmark category. Use `undefined` to get all bookmarks.
   */
  public getBookmarks(kind?: BookmarkKind): Bookmark[] {
    return this.bookmarkGroups
      .filter((group) => !kind || group.kind === kind)
      .flatMap((group) => group.getBookmarks());
  }

  /**
 * Has Bookmarks.
 * @param kind Bookmark category. Use `undefined` to check across all.
 */
  public hasBookmarks(kind?: BookmarkKind): boolean {
    return this.bookmarkGroups
      .some((group) => (!kind || group.kind === kind) && group.bookmarksCount);
  }

  /**
   * Event raised when bookmarks are added.
   */
  public get onDidAddBookmark(): vscode.Event<Bookmark[] | undefined> {
    return this.onDidAddBookmarkEmitter.event;
  }

  /**
   * Event raised when bookmarks are removed.
   */
  public get onDidRemoveBookmark(): vscode.Event<Bookmark[] | undefined> {
    return this.onDidRemoveBookmarkEmitter.event;
  }

  /**
   * Remove bookmarks.
   * @param bookmark Bookmark to remove. 
   */
  public async removeBookmarkAsync(bookmark: Bookmark): Promise<boolean> {
    const removedBookmarks = await this.removeBookmarksAsync([bookmark]);
    return !!removedBookmarks.length;
  }

  /**
   * Remove bookmarks.
   * @param bookmarks Bookmarks to remove. 
   */
  public async removeBookmarksAsync(bookmarks: Bookmark[]): Promise<Bookmark[]> {
    const removedBookmarks: Bookmark[] = [];
    for(const group of this.bookmarkGroups) {
      const groupBookmarks = bookmarks.filter((b) => b.group === group);
      if (groupBookmarks.length) {
        removedBookmarks.push(...await group.removeBookmarksAsync(groupBookmarks));
      }
    }
    if (removedBookmarks.length) {
      this.onDidRemoveBookmarkEmitter.fire(removedBookmarks);
    }
    return removedBookmarks;
  }
}