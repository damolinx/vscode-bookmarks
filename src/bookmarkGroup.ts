import * as vscode from 'vscode';
import { Bookmark, BookmarkKind } from './bookmark';
import { BookmarkDatastore } from './bookmarkDatastore';

export class BookmarkGroup {
  public readonly datastore: BookmarkDatastore;
  public readonly displayName: string;

  constructor(name: string, datastore: BookmarkDatastore) {
    this.datastore = datastore;
    this.displayName = name;
  }

  /**
   * Number of bookmarks in the group.
   */
  public get count(): number {
    return this.datastore.count;
  }

  /**
   * Get bookmark associated with `uri`.
   * @param uri URI to search for (line data is significant).
   * @returns Bookmark, if found.
   */
  public get(uri: vscode.Uri): Bookmark | undefined {
    return this.datastore.get(uri);
  }

  /**
   * Get all bookmarks.
   * Shortcut to {@link BookmarkGroup.datastore.getAll}.
   */
  public getAll(): Bookmark[] {
    return this.datastore.getAll();
  }

  /**
   * Bookmark group kind.
   */
  public get kind(): BookmarkKind {
    return this.datastore.kind;
  }
}
