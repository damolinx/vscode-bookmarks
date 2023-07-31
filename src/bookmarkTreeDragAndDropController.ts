import * as vscode from 'vscode';
import { Bookmark } from './bookmark';
import { BookmarkManager } from './bookmarkManager';
import { BookmarkTreeData } from './bookmarkTreeProvider';
import { RawMetadata } from './datastore/datastore';
import { BookmarkContainer } from './bookmarkContainer';

export class BookmarkTreeDragAndDropController
  implements vscode.TreeDragAndDropController<BookmarkTreeData>
{
  private readonly bookmarkManager: BookmarkManager;
  public readonly dropMimeTypes: ReadonlyArray<string>;
  public readonly dragMimeTypes: ReadonlyArray<string>;

  constructor(bookmarkManager: BookmarkManager) {
    this.bookmarkManager = bookmarkManager;
    this.dragMimeTypes = [];
    this.dropMimeTypes = ['application/vnd.code.tree.bookmarks', 'text/uri-list'];
  }

  async handleDrag(
    source: Array<BookmarkTreeData>,
    treeDataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const bookmarksOnly = source.filter((s) => s instanceof Bookmark);
    if (bookmarksOnly.length) {
      treeDataTransfer.set(
        'application/vnd.code.tree.bookmarks',
        new vscode.DataTransferItem(bookmarksOnly)
      );
    }
  }

  async handleDrop(
    target: BookmarkTreeData | undefined,
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken
  ): Promise<void> {
    let droppedUris: { uri: vscode.Uri; metadata?: RawMetadata }[] | undefined;
    const kind =
      target?.kind || (vscode.workspace.workspaceFolders?.length ? 'workspace' : 'global');
    const draggedBookmarks = <Bookmark[] | undefined>(
      dataTransfer.get('application/vnd.code.tree.bookmarks')?.value
    );
    if (draggedBookmarks) {
      droppedUris = draggedBookmarks.map((b) => ({ uri: b.uri, metadata: b.metadata }));
    } else {
      const draggedUriList = await dataTransfer.get('text/uri-list')?.asString();
      if (draggedUriList) {
        droppedUris = draggedUriList
          .split('\n')
          .map((uriStr) => ({ uri: vscode.Uri.parse(uriStr, true) }));
      }
    }

    // Add URIs to Target Kind.
    let addedBookmarks: BookmarkTreeData[] | undefined;
    if (droppedUris?.length) {
      if (target instanceof BookmarkContainer) {
        addedBookmarks = await target.addAsync(...droppedUris);
      } else {
        addedBookmarks = await this.bookmarkManager.addAsync(kind, ...droppedUris);
      }
    }

    // Remove Bookmarks that were dragged.
    if (draggedBookmarks?.length && addedBookmarks?.length) {
      const movedBookmarks = draggedBookmarks.filter((db) =>
        addedBookmarks!.some((ad) => ad.matchesUri(db.uri))
      );
      await this.bookmarkManager.removeBookmarksAsync(...movedBookmarks);
    }
  }
}
