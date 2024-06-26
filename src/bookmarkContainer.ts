import * as vscode from 'vscode';
import { basename } from 'path';
import { Bookmark, BookmarkKind } from './bookmark';
import { CONTAINER_SCHEME, Datastore, RawData, RawMetadata } from './datastore/datastore';
import { MetadataDatastore } from './datastore/metadataDatastore';

export class BookmarkContainer {
  public readonly datastore: Datastore;
  public readonly displayName: string;
  public readonly kind: BookmarkKind;
  public readonly container?: BookmarkContainer;
  public readonly uri: vscode.Uri;

  constructor(
    name: string,
    kindOrParent: BookmarkKind | BookmarkContainer,
    datastore: Datastore,
  ) {
    this.datastore = datastore;
    this.displayName = name;
    if (kindOrParent instanceof BookmarkContainer) {
      this.kind = kindOrParent.kind;
      this.container = kindOrParent;
    } else {
      this.kind = kindOrParent;
    }
    this.uri = BookmarkContainer.createUriForName(this.displayName, this.container);
  }

  /**
   * Create a {@link vscode.Uri} instance appropriate for a container.
   */
  public static createUriForName(name: string, parent?: BookmarkContainer): vscode.Uri {
    return parent
      ? parent.uri.with({ path: [parent.uri.path, name].join('/') })
      : vscode.Uri.from({ scheme: CONTAINER_SCHEME, path: name });
  }

  /**
   * Add bookmarks or containers.
   * @param entries Entries to add.
   * @returns List of added bookmarks or containers (no duplicates).
   */
  public async addAsync(
    ...entries: Array<{ uri: vscode.Uri; metadata?: RawMetadata }>
  ): Promise<Array<Bookmark | BookmarkContainer>> {
    const addedUris = await this.datastore.addAsync(entries);
    const addedItems = addedUris.map((uri) => {
      const entry = entries.find((entry) => entry.uri === uri);
      return this.createItem(uri, entry?.metadata || {});
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

  private createItem(uri: vscode.Uri, metadata: RawMetadata): Bookmark | BookmarkContainer {
    let item: Bookmark | BookmarkContainer;
    if (uri.scheme === CONTAINER_SCHEME) {
      item = new BookmarkContainer(
        basename(uri.fsPath),
        this,
        new MetadataDatastore(uri, metadata, this.datastore),
      );
    } else {
      item = new Bookmark(this, uri, metadata);
    }
    return item;
  }

  /**
   * Container Id.
   */
  public get id(): string {
    // Using DisplayName as dups are not allowed
    return this.isRoot ? this.kind : [this.container!.id, this.displayName].join('/');
  }

  /**
   * Get item matching `uri`.
   */
  public getItem(uri: vscode.Uri): Bookmark | BookmarkContainer | undefined {
    const metadata = this.datastore.getMetadata(uri);
    return metadata && this.createItem(uri, metadata);
  }

  /**
   * Get all items.
   */
  public getItems(): Array<Bookmark | BookmarkContainer> {
    const rawItems = this.datastore.getAll();
    return Object.entries(rawItems).map(([uriStr, metadata]) =>
      this.createItem(vscode.Uri.parse(uriStr, true), metadata || {}),
    );
  }

  /**
   * Whether container is a root node. This should be `true` only for `Global` or
   * `Workspace` nodes.
   */
  public get isRoot(): boolean {
    return !this.container;
  }

  /**
   * Tests whether `uri` matches current container.
   * @param uri URI to test against.
   */
  public matchesUri(uri: vscode.Uri): boolean {
    return uri.authority === this.uri.authority && uri.path === this.uri.path;
  }

  /**
   * Move an item under a new parent container.
   * @param item Item to move.
   * @param parent New parent.
   * @returns Item under new location, or `undefined` if item could not be moved.
   */
  public async moveAsync<TItem extends Bookmark | BookmarkContainer>(
    item: TItem,
    parent: BookmarkContainer,
  ): Promise<TItem | undefined> {
    let result: TItem | undefined;
    if (item instanceof Bookmark) {
      [result] = <Array<TItem | undefined>>await parent.addAsync(item);
    } else {
      const uri = BookmarkContainer.createUriForName(item.displayName, parent);
      const metadata =
        item.datastore instanceof MetadataDatastore ? item.datastore.rawStore.metadata : {};
      [result] = <Array<TItem | undefined>>await parent.addAsync({ uri, metadata });
      if (result) {
        const state = item.datastore.rawStore.get();
        if (state) {
          updateContainerState(state, uri);
          await (<BookmarkContainer>result).datastore.rawStore.setAsync(state);
        }
      }
    }

    if (result) {
      await item.container?.removeAsync(item);
    }

    return result;

    function updateContainerState(state: RawData, parentUri: vscode.Uri) {
      for (const [key, value] of Object.entries(state)) {
        if (key.startsWith(CONTAINER_SCHEME + ':')) {
          delete state[key];

          const newUri = parentUri.with({
            path: [parentUri.path, basename(key)].join('/'),
          });
          updateContainerState(<RawData>value, newUri);
          state[newUri.toString()] = value;
        }
      }
    }
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
  public async removeAsync(
    ...items: Array<Bookmark | BookmarkContainer>
  ): Promise<Array<Bookmark | BookmarkContainer>> {
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
      true /* override */,
    );
    const upsertedBookmarks = items.filter((b) => upserted.includes(b.uri));
    return upsertedBookmarks;
  }
}
