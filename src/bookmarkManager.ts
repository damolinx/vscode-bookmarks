import * as vscode from "vscode";
import { Bookmark, BookmarkKind } from "./bookmark";
import { BookmarkGroup, createBookmarkGroup } from "./bookmarkGroup";

export type BookmarkFilter = {
  /** Match URI */
  ignoreLineNumber?: boolean;
  kind?: BookmarkKind;
  uri?: vscode.Uri;
};

/**
 * Bookmark manager.
 */
export class BookmarkManager implements vscode.Disposable {
  private readonly bookmarkGroups: ReadonlyArray<BookmarkGroup>;
  private readonly onDidAddBookmarkEmitter: vscode.EventEmitter<Bookmark[] | undefined>;
  private readonly onDidChangeBookmarkEmitter: vscode.EventEmitter<Bookmark[] | undefined>;
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
    this.onDidChangeBookmarkEmitter = new vscode.EventEmitter<Bookmark[] | undefined>();
    this.onDidRemoveBookmarkEmitter = new vscode.EventEmitter<Bookmark[] | undefined>();
  }

  /**
   * Dispose this object.
   */
  public dispose() {
    this.onDidAddBookmarkEmitter.dispose();
    this.onDidChangeBookmarkEmitter.dispose();
    this.onDidRemoveBookmarkEmitter.dispose();
  }

  /**
   * Add bookmark.
   * @param pathOrUri URI to bookmark.
   * @param kind Bookmark kind.
   * @return {@link Bookmark} instance, if one was created.
   */
  public async addBookmarkAsync(pathOrUri: string | vscode.Uri, kind: BookmarkKind):
    Promise<Bookmark | undefined> {
    const uri = (pathOrUri instanceof vscode.Uri) ? pathOrUri : vscode.Uri.parse(pathOrUri);
    const addedBookmarks = await this.addBookmarksAsync([uri], kind);
    return addedBookmarks[0];
  }

  /**
   * Add bookmarks.
   * @param uris URIs to bookmark. 
   * @param kind Bookmark kind.
   * @return {@link Bookmark} instances that were created.
   */
  public async addBookmarksAsync(uris: vscode.Uri[], kind: BookmarkKind): Promise<Bookmark[]> {
    const bookmarkGroup: BookmarkGroup | undefined =
      this.bookmarkGroups.find((group) => group.kind === kind);

    const addedBookmarks: Bookmark[] = bookmarkGroup
      ? await bookmarkGroup.addAsync(uris) : [];

    if (addedBookmarks.length) {
      this.onDidAddBookmarkEmitter.fire(addedBookmarks);
    }
    return addedBookmarks;
  }

  /**
   * Get Bookmark, if any.
   * @param pathOrUri URI to bookmark.
   * @param kind Bookmark kind.
   */
  public getBookmark(pathOrUri: string | vscode.Uri, kind: BookmarkKind): Bookmark | undefined {
    const group = this.getBookmarkGroup(kind);
    let bookmark: Bookmark | undefined;
    if (group) {
      const uri = (pathOrUri instanceof vscode.Uri) ? pathOrUri : vscode.Uri.parse(pathOrUri);
      bookmark = group.getAll().find(bookmark => bookmark.matchesUri(uri));
    }
    return bookmark;
  }

  /**
   * Get Bookmark group.
   * @param kind Bookmark kind.
   */
  public getBookmarkGroup(kind: BookmarkKind): BookmarkGroup | undefined {
    return this.bookmarkGroups
      .find((group) => group.kind === kind);
  }

  /**
   * Get all bookmarks.
   * @param filter Filters to apply.
   */
  public getBookmarks(filter: BookmarkFilter = {}): Bookmark[] {
    let bookmarks = this.bookmarkGroups
      .filter((group) => !filter.kind || filter.kind === group.kind)
      .flatMap((group) => group.getAll());
    if (filter.uri) {
      bookmarks = bookmarks.filter(
        (bookmark) => bookmark.matchesUri(filter.uri!, filter.ignoreLineNumber));
    }
    return bookmarks;
  }

  /**
   * Has Bookmarks, of `kind` if present.
   * @param kind Bookmark kind.
   */
  public hasBookmarks(kind?: BookmarkKind): boolean {
    return this.bookmarkGroups
      .some((group) => (!kind || group.kind === kind) && group.count());
  }

  /**
   * Event raised when bookmarks are added.
   */
  public get onDidAddBookmark(): vscode.Event<Bookmark[] | undefined> {
    return this.onDidAddBookmarkEmitter.event;
  }

  /**
* Event raised when bookmarks are changed.
*/
  public get onDidChangeBookmark(): vscode.Event<Bookmark[] | undefined> {
    return this.onDidChangeBookmarkEmitter.event;
  }

  /**
   * Event raised when bookmarks are removed.
   */
  public get onDidRemoveBookmark(): vscode.Event<Bookmark[] | undefined> {
    return this.onDidRemoveBookmarkEmitter.event;
  }


  /**
   * Remove bookmarks.
   * @param pathOrUriOrBookmark Bookmark to remove. 
   * @param kind Kind of bookmark to remove.  Only applies for `string` or {@link Uri}.
   */
  public async removeBookmarkAsync(pathOrUriOrBookmark: Bookmark | string | vscode.Uri, kind?: BookmarkKind): Promise<boolean> {
    let bookmark: Bookmark | undefined;
    if (pathOrUriOrBookmark instanceof Bookmark) {
      bookmark = pathOrUriOrBookmark;
    } else {
      const group: BookmarkGroup | undefined = kind && this.getBookmarkGroup(kind);
      if (!group) {
        throw new Error(`Unknown 'kind': ${kind}`);
      }
      bookmark = new Bookmark(pathOrUriOrBookmark, group.kind);
    }

    const removedBookmarks = await this.removeBookmarksAsync([bookmark]);
    return !!removedBookmarks.length;
  }

  /**
   * Remove bookmarks.
   * @param bookmarks Bookmarks to remove. 
   */
  public async removeBookmarksAsync(bookmarks: Bookmark[]): Promise<Bookmark[]> {
    const removedBookmarks: Bookmark[] = [];
    for (const group of this.bookmarkGroups) {
      const groupBookmarks = bookmarks.filter((bookmark) => bookmark.kind === group.kind);
      if (groupBookmarks.length) {
        removedBookmarks.push(...await group.removeAsync(groupBookmarks));
      }
    }
    if (removedBookmarks.length) {
      this.onDidRemoveBookmarkEmitter.fire(removedBookmarks);
    }
    return removedBookmarks;
  }

  /**
   * Remove all bookmarks, filtered by `kind` if present.
   * @param kind Bookmark kind.
   */
  public async removeAllBookmarksAsync(kind?: BookmarkKind): Promise<Bookmark[]> {
    const removedBookmarks: Bookmark[] = [];
    const groups = kind
      ? this.bookmarkGroups.filter((group) => group.kind === kind)
      : this.bookmarkGroups;

    for (const group of groups) {
      removedBookmarks.push(...await group.removeAllAsync());
    }

    if (removedBookmarks.length) {
      this.onDidRemoveBookmarkEmitter.fire(removedBookmarks);
    }
    return removedBookmarks;
  }

  /**
   * Rename a bookmark.
   * @param bookmark Bookmark to rename.
   * @param name Bookmark display name. Use `undefined` to remove a previously defined name.
   */
  public async renameBookmarkAsync(bookmark: Bookmark, name?: string): Promise<void> {
    if (bookmark.displayName === name) {
      return; // Nothing to do
    }
    const bookmarkGroup: BookmarkGroup | undefined =
      this.bookmarkGroups.find((group) => group.kind === bookmark.kind);
    if (bookmarkGroup) {
      bookmark.displayName = name;
      await bookmarkGroup.updateAsync(bookmark);
      this.onDidChangeBookmarkEmitter.fire([bookmark]);
    }
  }
}