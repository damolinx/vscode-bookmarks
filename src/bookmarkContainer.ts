import * as vscode from 'vscode';
import { Bookmark, BookmarkKind } from './bookmark';
import { Datastore, MetadataType } from './datastore/datastore';

export const CONTAINER_SCHEME = 'bookmark-container';

export class BookmarkContainer {
  public readonly datastore: Datastore;
  public readonly displayName: string;
  public readonly kind: BookmarkKind;
  public readonly parent?: BookmarkContainer;
  public readonly uri: vscode.Uri;

  constructor(
    name: string,
    kindOrParent: BookmarkKind | BookmarkContainer,
    datastore: Datastore
  ) {
    this.datastore = datastore;
    this.displayName = name;
    if (kindOrParent instanceof BookmarkContainer) {
      this.kind = kindOrParent.kind;
      this.parent = kindOrParent;
    } else {
      this.kind = kindOrParent;
    }
    this.uri = BookmarkContainer.createUriForName(this.displayName, this.parent);
  }

  /**
   * Create a {@link vscode.Uri} instance appropriate for a container
   */
  public static createUriForName(name: string, parent?: BookmarkContainer): vscode.Uri {
    return parent
      ? parent.uri.with({ path: [parent.uri.path, name].join('/') })
      : vscode.Uri.from({ scheme: CONTAINER_SCHEME, path: name });
  }

  public async addAsync(
    ...entries: Array<{ uri: vscode.Uri; metadata?: MetadataType }>
  ): Promise<Array<Bookmark>> {
    const addedUris = await this.datastore.addAsync(entries);
    const addedItems = addedUris.map((uri) => {
      const entry = entries.find((entry) => entry.uri === uri);
      return this.createItem(uri, entry?.metadata);
    });

    return addedItems;
  }

  /**
   * Number of bookmarks in the container (non-recursive).
   */
  public get count(): number {
    // TODO: recursive flag.
    return this.datastore.count;
  }

  private createItem(uri: vscode.Uri, metadata?: MetadataType): Bookmark {
    return new Bookmark(uri, this.kind, metadata);
  }

  public getItem(uri: vscode.Uri): Bookmark | undefined {
    const metadata = this.datastore.get(uri);
    return metadata && this.createItem(uri, metadata);
  }

  public getItems(): Array<Bookmark> {
    const rawItems = this.datastore.getAll();
    return Object.entries(rawItems).map(([uriStr, metadata]) =>
      this.createItem(vscode.Uri.parse(uriStr, true), metadata)
    );
  }

  /**
   * Remove all items.
   */
  public removeAllAsync(): Promise<void> {
    return this.datastore.removeAllAsync();
  }

  /**
   * Remove items.
   * @param items Items to remove.
   * @return Removed items (no duplicates).
   */
  public async removeAsync(...items: Array<Bookmark>): Promise<Array<Bookmark>> {
    const removed = await this.datastore.removeAsync(items.map((b) => b.uri));
    const removedBookmarks = items.filter((b) => removed.includes(b.uri));
    return removedBookmarks;
  }

  /**
   * Upsert items. Last-one-wins in case of duplicates.
   * @param items Items to upsert.
   * @return Upserted items (no duplicates).
   */
  public async upsertAsync(...items: Array<Bookmark>): Promise<Array<Bookmark>> {
    const upserted = await this.datastore.addAsync(
      items.map((b) => ({ uri: b.uri, metadata: b.metadata })),
      true /* override */
    );
    const upsertedBookmarks = items.filter((b) => upserted.includes(b.uri));
    return upsertedBookmarks;
  }
}
