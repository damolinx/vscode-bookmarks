import * as vscode from 'vscode';
import { Bookmark } from './bookmark';
import { BookmarkManager } from './bookmarkManager';
import { BookmarkTreeItem } from './bookmarkTreeProvider';
import { RawMetadata } from './datastore/datastore';
import { BookmarkContainer } from './bookmarkContainer';

export class BookmarkTreeDragAndDropController
  implements vscode.TreeDragAndDropController<BookmarkTreeItem>
{
  private readonly bookmarkManager: BookmarkManager;
  public readonly dropMimeTypes: ReadonlyArray<string>;
  public readonly dragMimeTypes: ReadonlyArray<string>;

  constructor(bookmarkManager: BookmarkManager) {
    this.bookmarkManager = bookmarkManager;
    this.dragMimeTypes = [];
    this.dropMimeTypes = ['application/vnd.code.tree.bookmarks', 'text/uri-list'];
  }

  private getDefaultKind() {
    return vscode.workspace.workspaceFolders?.length ? 'workspace' : 'global';
  }

  public async handleDrag(
    source: BookmarkTreeItem[],
    treeDataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const bookmarksOnly = source.filter((s) => s instanceof Bookmark);
    if (bookmarksOnly.length) {
      treeDataTransfer.set(
        'application/vnd.code.tree.bookmarks',
        new vscode.DataTransferItem(bookmarksOnly),
      );
    }
  }

  public async handleDrop(
    target: BookmarkTreeItem | undefined,
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    dataTransfer.forEach(async (item, mimeType) => {
      switch (mimeType) {
        case 'application/vnd.code.tree.bookmarks':
          const bookmarks = <Bookmark[]>item.value;
          await this.handleBookmarkDrop(bookmarks, target);
          break;
        case 'text/uri-list':
          const uris = (await item.asString())
            .split('n')
            .map((uriStr) => ({ uri: vscode.Uri.parse(uriStr + '#L1', true) }));
          await this.handleUriDrop(uris, target);
          break;
      }
    });
  }

  private async handleBookmarkDrop(
    bookmarks: Bookmark[],
    target: BookmarkTreeItem | undefined,
  ): Promise<BookmarkTreeItem[]> {
    const addedItems = await this.handleUriDrop(
      bookmarks.map((b) => ({ uri: b.uri, metadata: b.metadata })),
      target,
    );

    // Remove Bookmarks that were dragged.
    if (addedItems?.length) {
      const movedBookmarks = bookmarks.filter((db) =>
        addedItems!.some((ad) => ad.matchesUri(db.uri)),
      );
      await this.bookmarkManager.removeBookmarksAsync(...movedBookmarks);
    }

    return addedItems;
  }

  private async handleUriDrop(
    uris: { uri: vscode.Uri; metadata?: RawMetadata }[],
    target: BookmarkTreeItem | undefined,
  ): Promise<BookmarkTreeItem[]> {
    const targetOrKind =
      target instanceof BookmarkContainer ? target : this.getDefaultKind();
    const addedItems = await this.bookmarkManager.addAsync(targetOrKind, ...uris);
    return addedItems;
  }
}
