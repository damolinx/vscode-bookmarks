import * as vscode from 'vscode';
import { Bookmark, BookmarkKind } from './bookmark';
import { BookmarkGroup } from './bookmarkGroup';
import { BookmarkDatastore } from './datastore/bookmarkDatastore';
import { BOOKMARK_METADATA_TYPE } from './datastore/datastore';
import { MementoDatastore } from './datastore/mementoDatastore';

export type BookmarkFilter = {
  /**
   * Ignore line number when matching URIs.
   */
  ignoreLineNumber?: boolean;
  /**
   * Use kind as filter.
   */
  kind?: BookmarkKind;
  /**
   * Use URI as filter.
   */
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
      new BookmarkGroup(
        'Global',
        new BookmarkDatastore('global', new MementoDatastore(context.globalState))
      ),
      new BookmarkGroup(
        'Workspace',
        new BookmarkDatastore('workspace', new MementoDatastore(context.workspaceState))
      ),
    ];
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
   * Add bookmarks.
   * @param kind Bookmark kind.
   * @param uris URIs to bookmark with accompanying metadata.
   * @return {@link Bookmark} instances.
   */
  public async addBookmarksAsync(
    kind: BookmarkKind,
    ...uris: vscode.Uri[]
  ): Promise<Bookmark[]> {
    const group = this.getBookmarkGroup(kind);
    const addedBookmarks = await group.datastore.addAsync(
      ...uris.map((uri) => new Bookmark(uri, kind))
    );
    if (addedBookmarks.length) {
      this.onDidAddBookmarkEmitter.fire(addedBookmarks);
    }
    return addedBookmarks;
  }

  /**
   * Get bookmark associated with `pathOrUri`.
   * @param kind Bookmark kind.
   * @param pathOrUri URI to bookmark.
   */
  public getBookmark(
    kind: BookmarkKind,
    pathOrUri: string | vscode.Uri
  ): Bookmark | undefined {
    const uri = pathOrUri instanceof vscode.Uri ? pathOrUri : vscode.Uri.parse(pathOrUri);
    return this.getBookmarks({ kind, uri })[0];
  }

  /**
   * Get Bookmark group.
   * @param kind Bookmark kind.
   * @returns Bookmark group.
   */
  public getBookmarkGroup(kind: BookmarkKind): BookmarkGroup {
    const group = this.bookmarkGroups.find((group) => group.kind === kind);
    if (!group) {
      throw new Error(`Unexpected Bookmark kind: ${kind}`);
    }
    return group;
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
      bookmarks = bookmarks.filter((bookmark) =>
        bookmark.matchesUri(filter.uri!, filter.ignoreLineNumber)
      );
    }
    return bookmarks;
  }

  /**
   * Checks if manager has bookmarks.
   * @param kind Bookmark kind filter.
   */
  public hasBookmarks(kind?: BookmarkKind): boolean {
    const groups = kind ? [this.getBookmarkGroup(kind)] : this.bookmarkGroups;
    return groups.some((group) => group.count);
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
  public async removeBookmarkAsync(
    pathOrUriOrBookmark: Bookmark | string | vscode.Uri,
    kind?: BookmarkKind
  ): Promise<boolean> {
    let bookmark: Bookmark | undefined;
    if (pathOrUriOrBookmark instanceof Bookmark) {
      bookmark = pathOrUriOrBookmark;
    } else if (kind) {
      const uri =
        pathOrUriOrBookmark instanceof vscode.Uri
          ? pathOrUriOrBookmark
          : vscode.Uri.parse(pathOrUriOrBookmark);
      bookmark = this.getBookmarkGroup(kind).get(uri);
    } else {
      throw new Error(`Missing kind for ${pathOrUriOrBookmark}`);
    }

    return !!(bookmark && (await this.removeBookmarksAsync([bookmark])).length);
  }

  /**
   * Remove bookmarks.
   * @param bookmarks Bookmarks to remove.
   */
  public async removeBookmarksAsync(bookmarks: Bookmark[]): Promise<Bookmark[]> {
    const removedBookmarks: Bookmark[] = [];

    for (const group of this.bookmarkGroups) {
      const groupBookmarks = bookmarks.filter((b) => b.kind === group.kind);
      const removedGroupBookmarks = await group.datastore.removeAsync(...groupBookmarks);
      removedBookmarks.push(...removedGroupBookmarks);
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
  public async removeAllBookmarksAsync(kind?: BookmarkKind): Promise<void> {
    const groups = kind ? [this.getBookmarkGroup(kind)] : this.bookmarkGroups;
    for (const group of groups) {
      await group.datastore.removeAllAsync();
    }
    this.onDidRemoveBookmarkEmitter.fire(undefined);
  }

  /**
   * Update a bookmark display name.
   * @param bookmark Bookmark to rename.
   * @param name Bookmark display name. Use `undefined` to remove a previously defined name.
   */
  public async renameBookmarkAsync(bookmark: Bookmark, name?: string): Promise<void> {
    if (bookmark.displayName === name) {
      return; // Nothing to do
    }
    const bookmarkGroup: BookmarkGroup | undefined = this.bookmarkGroups.find(
      (group) => group.kind === bookmark.kind
    );
    if (bookmarkGroup) {
      bookmark.displayName = name;
      await bookmarkGroup.datastore.upsert(bookmark);
      this.onDidChangeBookmarkEmitter.fire([bookmark]);
    }
  }

  /**
   * Update a bookmark line number.
   * @param bookmark Bookmark to update.
   * @param lineNumber Bookmark line number.
   */
  public async updateLineNumberAsync(
    bookmark: Bookmark,
    lineNumber: number
  ): Promise<Bookmark | undefined> {
    if (bookmark.lineNumber === lineNumber) {
      return; // Nothing to do
    }
    const bookmarkGroup: BookmarkGroup | undefined = this.bookmarkGroups.find(
      (group) => group.kind === bookmark.kind
    );
    if (bookmarkGroup) {
      // TODO: bookmark might need to behave more as an immutable.
      const oldUri = bookmark.uri;
      bookmark.lineNumber = lineNumber;
      await bookmarkGroup.datastore.updateBookmarkUri(oldUri, bookmark.uri);

      // TODO: this can only be reported correctly with old and new instances
      // TODO: should this be reported as add/remove?
      this.onDidChangeBookmarkEmitter.fire(undefined);
      return bookmark;
    }
    return undefined;
  }

  /**
   * Upgrade datastores.
   */
  public async upgradeDatastores(): Promise<void> {
    await Promise.all(this.bookmarkGroups.map((g) => g.datastore.upgradeAsync()));
  }
}
