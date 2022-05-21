import * as vscode from "vscode";
import { Bookmark, BookmarkKind } from "./bookmark";

export const MEMENTO_KEY_NAME = "bookmarks";

export class BookmarkManager implements vscode.Disposable {
  private readonly onDidAddBookmarkEmitter: vscode.EventEmitter<Bookmark[] | undefined>;
  private readonly onDidRemoveBookmarkEmitter: vscode.EventEmitter<Bookmark[] | undefined>;

  constructor(
    private readonly context: vscode.ExtensionContext) {
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
   * Has Bookmarks.
   */
  public hasBookmarks(kind?: BookmarkKind): boolean {
    return this.getMementos(kind)
      .some(({ memento }) => memento.get<string[]>(MEMENTO_KEY_NAME)?.length);
  }

  /**
   * Get Bookmark.
   * @param uri URI to bookmark.
   * @param kind Bookmark category.
   */
  public getBookmark(uri: vscode.Uri, kind: BookmarkKind): Bookmark | undefined {
    const {memento} = this.getMementos(kind)[0];
    const urisStr = memento.get<string[]>(MEMENTO_KEY_NAME, []);
    const uriStr = uri.toString();
    if (urisStr.includes(uriStr)) {
      return new Bookmark(uri, kind);
    }
    return undefined;
  }

  /**
   * Get Bookmarks.
   * @param kind Bookmark category. If missing, all bookmarks are returned.
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
   * Add bookmark.
   * @param uri URI to bookmark.
   * @param kind Bookmark category.
   * @returns {@link Bookmark} instance, if one was created.
   */
  public async addBookmarkAsync(uri: vscode.Uri, kind: BookmarkKind): Promise<Bookmark | undefined> {
    const addedBookmarks = await this.addBookmarksAsync([uri], kind);
    return addedBookmarks[0];
  }

  /**
   * Add bookmarks.
   * @param uris URIs to bookmark. 
   * @param kind Bookmark category.
   * @returns {@link Bookmark} instances that were created.
   */
  public async addBookmarksAsync(uris: vscode.Uri[], kind: BookmarkKind): Promise<Bookmark[]> {
    const addedBookmarks: Bookmark[] = [];
    const memento = kind === 'global' ? this.context.globalState : this.context.workspaceState;
    const uriStrs = memento.get<string[]>(MEMENTO_KEY_NAME, []);

    for (const uri of uris) {
      const uriStr = uri.toString();
      if (!uriStrs.includes(uriStr)) {
        uriStrs.push(uriStr);
        addedBookmarks.push(new Bookmark(uri, kind));
      }
    }

    if (addedBookmarks.length) {
      await memento.update(MEMENTO_KEY_NAME, uriStrs);
      this.onDidAddBookmarkEmitter.fire(addedBookmarks);
    }
    return addedBookmarks;
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
    const mementoInfos = this.getMementos().map(({ memento, kind }) => ({
      kind,
      memento,
      uriStrs: memento.get<string[]>(MEMENTO_KEY_NAME, []),
      updated: false
    }));

    for (const bookmark of bookmarks) {
      const mementoInfo = mementoInfos.find((m) => m.kind === bookmark.kind)!;
      const uriStr = bookmark.uri.toString();
      const filteredUriStrs = mementoInfo.uriStrs.filter((uri) => uri !== uriStr);
      if (filteredUriStrs.length !== mementoInfo.uriStrs.length) {
        mementoInfo.uriStrs = filteredUriStrs;
        mementoInfo.updated = true;
        removedBookmarks.push(bookmark);
      }
    }

    if (removedBookmarks.length) {
      for (const { memento, updated, uriStrs } of mementoInfos) {
        if (updated) {
          await memento.update(MEMENTO_KEY_NAME, uriStrs);
        }
      }
      this.onDidRemoveBookmarkEmitter.fire(removedBookmarks);
    }
    return removedBookmarks;
  }

  /**
  * Remove all bookmarks.
  */
  public async removeAllBookmarksAsync(kind?: BookmarkKind): Promise<void> {
    for (const { memento } of this.getMementos(kind)) {
      await memento.update(MEMENTO_KEY_NAME, []);
    }
    this.onDidRemoveBookmarkEmitter.fire(undefined);
  }

  private getMementos(kind?: string) {
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