import * as vscode from 'vscode';
import { Bookmark, BookmarkKind, BOOKMARK_CHANGE } from './bookmark';
import { BookmarkContainer } from './bookmarkContainer';
import { RawMetadata } from './datastore/datastore';
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
  private readonly disposable: vscode.Disposable;
  private readonly onDidAddBookmarkEmitter: vscode.EventEmitter<
    ReadonlyArray<Bookmark | BookmarkContainer> | undefined
  >;
  private readonly onDidChangeBookmarkEmitter: vscode.EventEmitter<
    ReadonlyArray<Bookmark | BookmarkContainer> | undefined
  >;
  private readonly onDidRemoveBookmarkEmitter: vscode.EventEmitter<
    ReadonlyArray<Bookmark | BookmarkContainer> | undefined
  >;
  private readonly rootContainers: ReadonlyArray<BookmarkContainer>;

  /**
   * Constructor.
   * @param context Context.
   */
  constructor(context: vscode.ExtensionContext) {
    this.rootContainers = [
      new BookmarkContainer('Global', 'global', new MementoDatastore(context.globalState)),
      new BookmarkContainer(
        'Workspace',
        'workspace',
        new MementoDatastore(context.workspaceState),
      ),
    ];
    this.disposable = vscode.Disposable.from(
      (this.onDidAddBookmarkEmitter = new vscode.EventEmitter<
        ReadonlyArray<Bookmark | BookmarkContainer> | undefined
      >()),
      (this.onDidChangeBookmarkEmitter = new vscode.EventEmitter<
        ReadonlyArray<Bookmark | BookmarkContainer> | undefined
      >()),
      (this.onDidRemoveBookmarkEmitter = new vscode.EventEmitter<
        ReadonlyArray<Bookmark | BookmarkContainer> | undefined
      >()),
    );
  }

  /**
   * Dispose this object.
   */
  public dispose() {
    this.disposable.dispose();
  }

  /**
   * Add bookmarks or bookmark coontainers.
   */
  public async addAsync(
    parentOrKind: BookmarkContainer | BookmarkKind,
    ...entries: Array<{ uri: vscode.Uri; metadata?: RawMetadata }>
  ): Promise<Array<Bookmark | BookmarkContainer>> {
    let addedItems: Array<Bookmark | BookmarkContainer>;
    if (entries.length === 0) {
      addedItems = []; // nothing to add.
    } else {
      const container =
        parentOrKind instanceof BookmarkContainer
          ? parentOrKind
          : this.getRootContainer(parentOrKind);
      addedItems = await container.addAsync(...entries);

      if (addedItems.length) {
        this.onDidAddBookmarkEmitter.fire(addedItems);
      }
    }
    return addedItems;
  }

  /**
   * Get `kind` root container.
   * @param kind Bookmark kind.
   * @returns Bookmark container.
   */
  public getRootContainer(kind: BookmarkKind): BookmarkContainer {
    const container = this.rootContainers.find((c) => c.kind === kind);
    if (!container) {
      throw new Error(`Unexpected Bookmark kind: ${kind}`);
    }
    return container;
  }

  /**
   * Get all bookmarks.
   * @param filter Filters to apply.
   */
  public getBookmarks(filter: BookmarkFilter = {}): Bookmark[] {
    const bookmarks: Bookmark[] = [];

    let containers = [...this.rootContainers];
    if (filter.kind) {
      containers = containers.filter((container) => filter.kind === container.kind);
    }

    while (containers.length) {
      const container = containers.shift();
      container!.getItems().forEach((item) => {
        if (item instanceof BookmarkContainer) {
          containers.push(item);
        } else if (!filter.uri || item.matchesUri(filter.uri, filter.ignoreLineNumber)) {
          bookmarks.push(item);
        }
      });
    }

    return bookmarks;
  }

  /**
   * Checks if manager has bookmarks.
   * @param kind Bookmark kind filter.
   */
  public hasBookmarks(kind?: BookmarkKind): boolean {
    const containers = kind
      ? this.rootContainers.filter((c) => c.kind === kind)
      : this.rootContainers;
    return containers.some((c) => c.count);
  }

  /**
   * Event raised when bookmarks are added.
   */
  public get onDidAddBookmark(): vscode.Event<
    ReadonlyArray<Bookmark | BookmarkContainer> | undefined
  > {
    return this.onDidAddBookmarkEmitter.event;
  }

  /**
   * Event raised when bookmarks are changed.
   */
  public get onDidChangeBookmark(): vscode.Event<
    ReadonlyArray<Bookmark | BookmarkContainer> | undefined
  > {
    return this.onDidChangeBookmarkEmitter.event;
  }

  /**
   * Event raised when bookmarks are removed.
   */
  public get onDidRemoveBookmark(): vscode.Event<
    ReadonlyArray<Bookmark | BookmarkContainer> | undefined
  > {
    return this.onDidRemoveBookmarkEmitter.event;
  }

  /**
   * Move an item under a new parent container.
   * @param items Items to move.
   * @param parent New parent.
   * @returns Item under new location, or `undefined` if item could not be moved.
   */
  public async moveAsync<TItem extends Bookmark | BookmarkContainer>(
    items: TItem[],
    parent: BookmarkContainer,
  ): Promise<TItem[]> {
    const movedItems = await Promise.all(
      items.map(async (item) => item.container!.moveAsync(item, parent)),
    );
    const removedItems = items.filter((_, index) => !!movedItems[index]);
    if (removedItems.length) {
      this.onDidRemoveBookmarkEmitter.fire(removedItems);
      this.onDidAddBookmarkEmitter.fire(<TItem[]>movedItems.filter((i) => !!i));
    }
    return [];
  }

  /**
   * Remove bookmarks.
   * @param pathOrUriOrBookmark Bookmark to remove.
   * @param kind Kind of bookmark to remove.  Only applies for `string` or {@link Uri}.
   */
  public async removeBookmarkAsync(
    pathOrUriOrBookmark: Bookmark | string | vscode.Uri,
    kind?: BookmarkKind,
  ): Promise<boolean> {
    let item: Bookmark | BookmarkContainer | undefined;
    if (pathOrUriOrBookmark instanceof Bookmark) {
      item = pathOrUriOrBookmark;
    } else if (kind) {
      const uri =
        pathOrUriOrBookmark instanceof vscode.Uri
          ? pathOrUriOrBookmark
          : vscode.Uri.parse(pathOrUriOrBookmark);
      item = this.getRootContainer(kind).getItem(uri);
    } else {
      throw new Error(`Missing kind for ${pathOrUriOrBookmark}`);
    }

    return !!(item && (await this.removeBookmarksAsync(item)).length);
  }

  /**
   * Remove bookmarks.
   * @param items Bookmarks to remove.
   */
  public async removeBookmarksAsync(
    ...items: Array<Bookmark | BookmarkContainer>
  ): Promise<Array<Bookmark | BookmarkContainer>> {
    const removedBookmarks: Array<Bookmark | BookmarkContainer> = [];
    for (const item of items) {
      // TODO: better API, this might lead to multiple saves
      const removedGroupBookmarks = await item.container?.removeAsync(item);
      if (removedGroupBookmarks) {
        removedBookmarks.push(...removedGroupBookmarks);
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
  public async removeAllBookmarksAsync(kind?: BookmarkKind): Promise<void> {
    const containers = kind
      ? this.rootContainers.filter((c) => c.kind === kind)
      : this.rootContainers;
    await Promise.all(containers.map((c) => c.removeAllAsync()));
    this.onDidRemoveBookmarkEmitter.fire(undefined);
  }

  /**
   * Update a bookmark.
   * @param bookmark Bookmark to rename.
   * @param change Bookmark change.
   * @returns Updated {@link Bookmark} instance if any changes were applied,
   * `bookmark` otherwise.
   */
  public async updateBookmarkAsync(
    bookmark: Bookmark,
    change: Omit<BOOKMARK_CHANGE, 'kind'>,
  ): Promise<Bookmark> {
    const newBookmark = bookmark.with(change);
    if (bookmark === newBookmark) {
      return bookmark; // Nothing to do
    }

    const rename = bookmark.uri !== newBookmark.uri;

    const { container } = bookmark;

    const [updatedBookmark] = await (rename
      ? container.addAsync(newBookmark) //TODO: should be atomic
      : container.upsertAsync(newBookmark));

    if (updatedBookmark) {
      if (rename) {
        await container.removeAsync(bookmark);
        this.onDidAddBookmarkEmitter.fire([newBookmark]);
        this.onDidRemoveBookmarkEmitter.fire([bookmark]);
      } else {
        // TODO: old/new or change
        this.onDidChangeBookmarkEmitter.fire([newBookmark]);
      }
    }

    if (updatedBookmark instanceof BookmarkContainer) {
      throw new Error('BUG: upserted a container'); //TODO
    }

    return updatedBookmark || bookmark;
  }

  /**
   * Upgrade datastores.
   */
  public async upgradeDatastores(): Promise<void> {
    await Promise.all(this.rootContainers.map((c) => c.datastore.upgradeAsync()));
  }
}
