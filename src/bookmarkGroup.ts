import * as vscode from 'vscode';
import { Bookmark, BookmarkKind } from './bookmark';

export const MEMENTO_KEY_NAME = "bookmarks";

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
  public readonly kind: BookmarkKind;
  private readonly memento: vscode.Memento;
  public readonly name: string;

  constructor(name: string, kind: BookmarkKind, memento: vscode.Memento) {
    this.kind = kind;
    this.memento = memento;
    this.name = name;
  }

  /**
   * Add bookmarks.
   * @returns Added bookmark. 
   */
  public async addBookmarksAsync(uris: vscode.Uri[]): Promise<Bookmark[]> {
    const addedBookmarks: Bookmark[] = [];
    const savedUris = this.memento.get<string[]>(MEMENTO_KEY_NAME, []);
    for (const uri of uris) {
      const uriStr = uri.toString();
      if (!savedUris.includes(uriStr)) {
        savedUris.push(uriStr);
        addedBookmarks.push(new Bookmark(uri, this.kind));
      }
    }
    if (addedBookmarks.length) {
      await this.memento.update(MEMENTO_KEY_NAME, savedUris);
    }
    return addedBookmarks;
  }

  /**
   * Number of bookmarks in group.
   */
  public getBookmarkCount(): number {
    return this.memento.get<string[]>(MEMENTO_KEY_NAME)?.length || 0;
  }

  /**
   * Group bookmarks {@param uri}.
   */
  public contains(uri: vscode.Uri): boolean {
    const uriStr = uri.toString();
    return !!this.memento.get<string[]>(MEMENTO_KEY_NAME)?.find((s) => s === uriStr);
  }

  /**
   * Get all {@link Bookmark} bookmarks associated with {@param uri}.
   */
  public getBookmark(uri: vscode.Uri): Bookmark | undefined {
    return this.contains(uri) ? new Bookmark(uri, this.kind) : undefined;
  }

  /**
   * Get all {@link Bookmark} bookmarks.
   */
  public getBookmarks(): Bookmark[] {
    return this.memento.get<string[]>(MEMENTO_KEY_NAME, [])
      .map((s) => new Bookmark(vscode.Uri.parse(s), this.kind));
  }

  /**
   * Remove bookmarks.
   */
  public async removeBookmarksAsync(bookmarks: Bookmark[]): Promise<Bookmark[]> {
    const removedBookmarks: Bookmark[] = [];
    let uris = this.memento.get<string[]>(MEMENTO_KEY_NAME, []);

    for(const bookmark of bookmarks) {
      const uriStr = bookmark.uri.toString();
      const filteredUris = uris.filter((s) => s !== uriStr);
      if (filteredUris.length != uris.length) {
        uris = filteredUris;
        removedBookmarks.push(bookmark);
      }
    }

    if (removedBookmarks.length) {
      await this.memento.update(MEMENTO_KEY_NAME, uris);
    }
    return removedBookmarks;
  }
}