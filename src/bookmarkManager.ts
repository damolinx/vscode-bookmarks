import * as vscode from "vscode";
import { Bookmark, BookmarkKind } from "./bookmark";

const MEMENTO_KEY_NAME = "bookmarks";

export interface BookmarkEvent {
  bookmark?: Bookmark;
  kind: BookmarkKind;
}

export class BookmarkManager implements vscode.Disposable {
  private readonly onDidAddBookmarkEmitter: vscode.EventEmitter<BookmarkEvent | undefined>;
  private readonly onDidRemoveBookmarkEmitter: vscode.EventEmitter<BookmarkEvent | undefined>;

  constructor(
    private readonly context: vscode.ExtensionContext) {
    this.onDidAddBookmarkEmitter = new vscode.EventEmitter<BookmarkEvent | undefined>();
    this.onDidRemoveBookmarkEmitter = new vscode.EventEmitter<BookmarkEvent | undefined>();
  }

  /**
   * Dispose this object.
   */
  public dispose() {
    this.onDidAddBookmarkEmitter.dispose();
    this.onDidRemoveBookmarkEmitter.dispose();
  }

  /**
   * Has Bookmarks.
   */
  public hasBookmarks(kind?: BookmarkKind): boolean {
    return this.getMementos(kind)
      .some(({memento}) => memento.get<string[]>(MEMENTO_KEY_NAME)?.length);
  }

  /**
   * Get Bookmarks.
   */
  public getBookmarks(kind?: BookmarkKind): Bookmark[] {
    const bookmarks: Bookmark[] = [];
    for (const { memento, kind: mementoKind } of this.getMementos(kind)) {
      for (const uri of memento.get<string[]>(MEMENTO_KEY_NAME, [])) {
        bookmarks.push(new Bookmark(vscode.Uri.parse(uri), mementoKind));
      }
    }
    return bookmarks;
  }

  /**
   * Event raised when a bookmark is added.
   */
  public get onDidAddBookmark(): vscode.Event<BookmarkEvent | undefined> {
    return this.onDidAddBookmarkEmitter.event;
  }

  /**
   * Event raised when a bookmark is removed.
   */
  public get onDidRemoveBookmark(): vscode.Event<BookmarkEvent | undefined> {
    return this.onDidRemoveBookmarkEmitter.event;
  }

  /**
   * Add a new bookmark.
   * @param uri URI to bookmark. 
   */
  public async addBookmarkAsync(uri: vscode.Uri, kind: BookmarkKind = 'global'): Promise<Bookmark | undefined> {
    const memento = kind === 'global' ? this.context.globalState : this.context.workspaceState;
    const bookmarks = memento.get<string[]>(MEMENTO_KEY_NAME, []);

    let bookmark: Bookmark | undefined;
    const uriStr = uri.toString();
    if (!bookmarks.find(b => b === uriStr)) {
      bookmarks.push(uriStr);
      bookmarks.sort();
      await memento.update(MEMENTO_KEY_NAME, bookmarks);
      bookmark = new Bookmark(uri, kind);
      this.onDidAddBookmarkEmitter.fire({
        bookmark,
        kind
      });
    }
    return bookmark;
  }

  /**
   * Remove an existing bookmark.
   * @param bookmark Bookmark instance. Set `kind` to undefined to remove-kind ocurrences. 
   */
  public async removeBookmarkAsync(bookmark: Bookmark): Promise<void> {
    const uriStr = bookmark.uri.toString();
    for (const { memento, kind: mementoKind } of this.getMementos(bookmark.kind)) {
      const bookmarks = memento.get<string[]>(MEMENTO_KEY_NAME, []);
      const filteredBookmarks = bookmarks.filter((b) => b !== uriStr);
      if (filteredBookmarks.length !== bookmarks.length) {
        await memento.update(MEMENTO_KEY_NAME, filteredBookmarks);
        this.onDidRemoveBookmarkEmitter.fire({
          bookmark,
          kind: mementoKind
        });
      }
    }
  }

  /**
  * Remove all bookmarks.
  */
  public async removeAllBookmarksAsync(kind?: BookmarkKind): Promise<void> {
    for (const { memento, kind: mementoKind } of this.getMementos(kind)) {
      await memento.update(MEMENTO_KEY_NAME, []);
      this.onDidRemoveBookmarkEmitter.fire({ kind: mementoKind });
    }
  }

  private getMementos(kind: string | undefined) {
    const mementos: { memento: vscode.Memento; kind: BookmarkKind; }[] = [];
    if (kind === 'global' || !kind) {
      mementos.push({ memento: this.context.globalState, kind: 'global' });
    }
    if (kind === 'workspace' || !kind) {
      mementos.push({ memento: this.context.workspaceState, kind: 'workspace' });
    }
    return mementos;
  }
}