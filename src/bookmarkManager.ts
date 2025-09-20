import * as vscode from 'vscode';
import { Bookmark, BookmarkKind, BookmarkUpdate } from './bookmark';
import { BookmarkContainer } from './bookmarkContainer';
import { RawMetadata } from './datastore/datastore';
import { MementoDatastore } from './datastore/mementoDatastore';

export interface BookmarkFilter {
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
}

/**
 * Bookmark manager.
 */
export class BookmarkManager implements vscode.Disposable {
  private readonly disposable: vscode.Disposable;
  private readonly onDidAddBookmarkEmitter: vscode.EventEmitter<
    readonly (Bookmark | BookmarkContainer)[] | undefined
  >;
  private readonly onDidChangeBookmarkEmitter: vscode.EventEmitter<
    readonly (Bookmark | BookmarkContainer)[] | undefined
  >;
  private readonly onDidRemoveBookmarkEmitter: vscode.EventEmitter<
    readonly (Bookmark | BookmarkContainer)[] | undefined
  >;
  private readonly rootContainers: readonly BookmarkContainer[];

  /**
   * Constructor.
   * @param context Context.
   */
  constructor(context: vscode.ExtensionContext) {
    this.rootContainers = [
      new BookmarkContainer('Global', 'global', new MementoDatastore(context.globalState)),
      new BookmarkContainer('Workspace', 'workspace', new MementoDatastore(context.workspaceState)),
    ];
    this.disposable = vscode.Disposable.from(
      (this.onDidAddBookmarkEmitter = new vscode.EventEmitter<
        readonly (Bookmark | BookmarkContainer)[] | undefined
      >()),
      (this.onDidChangeBookmarkEmitter = new vscode.EventEmitter<
        readonly (Bookmark | BookmarkContainer)[] | undefined
      >()),
      (this.onDidRemoveBookmarkEmitter = new vscode.EventEmitter<
        readonly (Bookmark | BookmarkContainer)[] | undefined
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
   * Add bookmarks or bookmark containers.
   */
  public async addAsync(
    parentOrKind: BookmarkContainer | BookmarkKind,
    ...entries: { uri: vscode.Uri; metadata?: RawMetadata }[]
  ): Promise<(Bookmark | BookmarkContainer)[]> {
    let addedItems: (Bookmark | BookmarkContainer)[];
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
   * Add a bookmark folder. If folder already exists, it will be returned instead.
   * If logic needs to know whether folder exists, use {@link addAsync}.
   */
  public async addFolderAsync(
    parentOrKind: BookmarkContainer | BookmarkKind,
    name: string,
  ): Promise<BookmarkContainer> {
    const parent =
      parentOrKind instanceof BookmarkContainer
        ? parentOrKind
        : this.getRootContainer(parentOrKind);
    const targetUri = BookmarkContainer.createUriForName(name, parent);

    const addedItems = await this.addAsync(parent, {
      uri: targetUri,
    });

    let folder: BookmarkContainer;
    if (addedItems.length) {
      folder = addedItems[0] as BookmarkContainer;
    } else {
      folder = parent.getItem(targetUri) as BookmarkContainer;
    }

    return folder;
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
   * @param filter Bookmark filter (always ignores `lineNumber`).
   */
  public hasBookmarks(filter: Omit<BookmarkFilter, 'ignoreLineNumber'> = {}): boolean {
    const containers = filter.kind
      ? this.rootContainers.filter((c) => c.kind === filter.kind)
      : this.rootContainers;

    return filter.uri
      ? containers.some((c) => c.getItems().some((i) => i.matchesUri(filter.uri!, true)))
      : containers.some((c) => c.count);
  }

  /**
   * Event raised when bookmarks are added.
   */
  public get onDidAddBookmark(): vscode.Event<
    readonly (Bookmark | BookmarkContainer)[] | undefined
  > {
    return this.onDidAddBookmarkEmitter.event;
  }

  /**
   * Event raised when bookmarks are changed.
   */
  public get onDidChangeBookmark(): vscode.Event<
    readonly (Bookmark | BookmarkContainer)[] | undefined
  > {
    return this.onDidChangeBookmarkEmitter.event;
  }

  /**
   * Event raised when bookmarks are removed.
   */
  public get onDidRemoveBookmark(): vscode.Event<
    readonly (Bookmark | BookmarkContainer)[] | undefined
  > {
    return this.onDidRemoveBookmarkEmitter.event;
  }

  /**
   * Move an item under a new parent container.
   * @param parent New parent.
   * @param items Items to move.
   * @returns Item under new parent, or `undefined` if no item could not be moved.
   */
  public async moveAsync<TItem extends Bookmark | BookmarkContainer>(
    parent: BookmarkContainer,
    ...items: TItem[]
  ): Promise<TItem[]> {
    let movedItems: TItem[];
    const moveResults = await Promise.all(
      items.map(async (item) => item.container!.moveAsync(item, parent)),
    );
    const removedItems = items.filter((_, index) => !!moveResults[index]);
    if (removedItems.length) {
      movedItems = moveResults.filter((i) => !!i) as TItem[];
      this.onDidRemoveBookmarkEmitter.fire(removedItems);
      this.onDidAddBookmarkEmitter.fire(movedItems);
    } else {
      movedItems = [];
    }
    return movedItems;
  }

  /**
   * Force refresh. Manager does not really cache any data, so event listeners
   * are just notified they need to reload.
   */
  public refresh(...items: (Bookmark | BookmarkContainer)[]) {
    this.onDidChangeBookmarkEmitter.fire(items.length ? items : undefined);
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
    ...items: (Bookmark | BookmarkContainer)[]
  ): Promise<(Bookmark | BookmarkContainer)[]> {
    const removedBookmarks: (Bookmark | BookmarkContainer)[] = [];
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
   * Rename bookmarks (due to a FS event). To update data, use {@link updateBookmarkAsync} which
   * can also be a rename when changing line number.
   */
  public async renameBookmarks(...entries: { oldUri: vscode.Uri; newUri: vscode.Uri }[]) {
    const updates = entries.flatMap(({ oldUri, newUri }) => {
      const oldBookmarks = this.getBookmarks({ uri: oldUri, ignoreLineNumber: true });
      // TODO: Push this to datastore so a rename is a single operation. Right now, this could
      // end up updating/saving the same datastore for as many bookmarks as matched.
      return oldBookmarks.map((oldBookmark) => {
        const newBookmarkUri = newUri.with({
          fragment: `L${oldBookmark.start}${oldBookmark.end ? `-L${oldBookmark.end}` : ''}`,
        });
        return oldBookmark.container.datastore.replaceAsync(oldBookmark.uri, newBookmarkUri);
      });
    });

    if (updates) {
      await Promise.all(updates.filter((p): p is Promise<RawMetadata | undefined> => !!p));
      this.onDidChangeBookmarkEmitter.fire(undefined);
    }
  }

  /**
   * Rename a bookmark folder.
   */
  public async renameBookmarkFolder(
    folder: BookmarkContainer,
    name: string,
  ): Promise<BookmarkContainer | undefined> {
    const newFolder = await folder.renameAsync(name);
    if (newFolder) {
      this.onDidRemoveBookmarkEmitter.fire([folder]);
      this.onDidAddBookmarkEmitter.fire([newFolder]);
    }
    return newFolder;
  }

  /**
   * Update a bookmark.
   * @param bookmark Bookmark to rename.
   * @param change Bookmark change. {@link Bookmark.kind} is not updatable because
   * it means changing datastores.
   * @returns Updated {@link Bookmark} instance if any changes were applied,
   * `bookmark` otherwise.
   */
  public async updateBookmarkAsync(
    bookmark: Bookmark,
    change: Omit<BookmarkUpdate, 'kind'>,
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
