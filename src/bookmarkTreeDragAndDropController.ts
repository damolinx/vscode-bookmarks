import * as vscode from 'vscode';
import { Bookmark } from './bookmark';
import { BookmarkGroup } from './bookmarkGroup';
import { BookmarkManager } from './bookmarkManager';
import { BOOKMARK_METADATA_TYPE } from './datastore/datastore';

export class BookmarkTreeDragAndDropController
  implements vscode.TreeDragAndDropController<BookmarkGroup | Bookmark>
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
    source: (BookmarkGroup | Bookmark)[],
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
    target: BookmarkGroup | Bookmark | undefined,
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken
  ): Promise<void> {
    let droppedUris:
      | { uri: string | vscode.Uri; metadata?: BOOKMARK_METADATA_TYPE }[]
      | undefined;
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
    if (droppedUris?.length) {
      await this.bookmarkManager.addBookmarksAsync(kind, ...droppedUris);
    }

    // Remove Bookmarks that were dragged
    if (draggedBookmarks?.length) {
      await this.bookmarkManager.removeBookmarksAsync(...draggedBookmarks);
    }
  }
}
