import * as vscode from 'vscode';
import { Bookmark } from './bookmark';
import { BookmarkContainer } from './bookmarkContainer';
import { BookmarkManager } from './bookmarkManager';
import { MetadataType } from './datastore/datastore';

export class BookmarkTreeDragAndDropController
  implements vscode.TreeDragAndDropController<BookmarkContainer | Bookmark>
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
    source: (BookmarkContainer | Bookmark)[],
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
    target: BookmarkContainer | Bookmark | undefined,
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken
  ): Promise<void> {
    let droppedUris: { uri: string | vscode.Uri; metadata?: MetadataType }[] | undefined;
    const kind =
      target?.kind || (vscode.workspace.workspaceFolders?.length ? 'workspace' : 'global');
    const draggedBookmarks = (<Bookmark[] | undefined>(
      dataTransfer.get('application/vnd.code.tree.bookmarks')?.value
    ))?.filter((b) => b.kind != kind);
    if (draggedBookmarks) {
      droppedUris = draggedBookmarks.map((b) => ({ uri: b.uri, metadata: b.metadata }));
    } else {
      const draggedUriList = await dataTransfer.get('text/uri-list')?.asString();
      if (draggedUriList) {
        droppedUris = draggedUriList.split('\n').map((uri) => ({ uri }));
      }
    }

    // Add URIs to Target Kind.
    let addedItems = false;
    if (droppedUris?.length) {
      addedItems = !!(await this.bookmarkManager.addBookmarksAsync(kind, ...droppedUris))
        .length;
    }

    // Remove Bookmarks that were dragged, but dont remove if we didt move anything.
    if (draggedBookmarks?.length && addedItems) {
      await this.bookmarkManager.removeBookmarksAsync(...draggedBookmarks);
    }
  }
}
