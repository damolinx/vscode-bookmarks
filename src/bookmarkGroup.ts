import { ExtensionContext, Memento, Uri } from 'vscode';
import { Bookmark, BookmarkKind } from './bookmark';
import { BookmarkDatastore } from './bookmarkDatastore';

export function createBookmarkGroup(context: ExtensionContext, kind: BookmarkKind): BookmarkGroup {
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

  constructor(name: string, kind: BookmarkKind, memento: Memento) {
    this.datastore = new BookmarkDatastore(memento);
    this.displayName = name;
    this.kind = kind;
  }

  /**
   * Add bookmarks.
   * @return Added bookmarks,
   */
  public async addAsync(uris: Uri[]): Promise<Bookmark[]> {
    const addedUris = await this.datastore.addAsync(
      ...uris.map((uri) => ({ uri, metadata: {} }))
    );
    const addedBookmarks = (await addedUris).map(
      (uri) => new Bookmark(uri, this.kind));
    return addedBookmarks;
  }

  /**
   * Number of bookmarks in group.
   */
  public count(): number {
    return this.datastore.count();
  }

  /**
   * Get all {@link Bookmark} bookmarks associated with `uri`.
   */
  public get(uri: Uri): Bookmark | undefined {
    const bookmarkData = this.datastore.get(uri); //TODO: use metadata
    return bookmarkData ? new Bookmark(uri, this.kind) : undefined;
  }

  /**
   * Get all {@link Bookmark} bookmarks.
   */
  public getAll(): Bookmark[] {
    const bookmarks = this.datastore.getAll();
    //TODO: use metadata
    return Object.entries(bookmarks)
      .map(([uri, _bookmarkData]) => new Bookmark(Uri.parse(uri), this.kind));
  }

  /**
   * Remove bookmarks.
   */
  public async removeAsync(bookmarks: Bookmark[]): Promise<Bookmark[]> {
    const removedUris = await this.datastore.removeAsync(
      ...bookmarks.map((b) => b.uri));
    return bookmarks.filter(
      (b) => removedUris.includes(b.uri));
  }

  /**
   * Remove all bookmarks.
   */
  public async removeAllAsync(): Promise<Bookmark[]> {
    const removedBookmarks: Bookmark[] = this.getAll();
    await this.datastore.updateAsync();
    return removedBookmarks;
  }

  /**
   * Update bookmark.
   */
  public async updateAsync(bookmark: Bookmark): Promise<void> {
     await this.datastore.addAsync(
      {uri: bookmark.uri, metadata: {}} // TODO: Add metadata
    );
  }
}