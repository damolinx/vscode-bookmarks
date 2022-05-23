import * as vscode from "vscode";
import { Bookmark } from "./bookmark";
import { BookmarkGroup } from './bookmarkGroup';
import { BookmarkManager } from "./bookmarkManager";

export class BookmarkTreeDragAndDropController implements vscode.TreeDragAndDropController<BookmarkGroup | Bookmark> {
  private readonly bookmarkManager: BookmarkManager;
  public readonly dropMimeTypes: ReadonlyArray<string>;
  public readonly dragMimeTypes: ReadonlyArray<string>;

  constructor(bookmarkManager: BookmarkManager) {
    this.bookmarkManager = bookmarkManager;
    this.dragMimeTypes = [];
    this.dropMimeTypes = ['application/vnd.code.tree.bookmarks', 'text/uri-list'];
  }

  async handleDrag(source: (BookmarkGroup | Bookmark)[], treeDataTransfer: vscode.DataTransfer, _token: vscode.CancellationToken): Promise<void> {
    const bookmarksOnly = source.filter((s) => s instanceof Bookmark);
    if (bookmarksOnly.length) {
      treeDataTransfer.set('application/vnd.code.tree.bookmarks', new vscode.DataTransferItem(source));
    }
  }

  async handleDrop(target: BookmarkGroup | Bookmark | undefined, dataTransfer: vscode.DataTransfer, _token: vscode.CancellationToken): Promise<void> {
    let droppedUris: vscode.Uri[] | undefined;
    const draggedBookmarks: Bookmark[] | undefined = dataTransfer.get('application/vnd.code.tree.bookmarks')?.value;
    if (draggedBookmarks) {
      droppedUris = draggedBookmarks.map((b) => b.uri);
    } else {
      const draggedUriList = await dataTransfer.get('text/uri-list')?.asString();
      if (draggedUriList) {
        droppedUris = draggedUriList.split('\n').map((uriStr) => {
          let uri = vscode.Uri.parse(uriStr);
          if (uri.scheme === 'vscode-remote') {
            // TODO: This fixes the URIs received from WSL, but it might not
            // be correct for all scenarios (e.g. multiple distros).
            uri = vscode.Uri.file(uri.fsPath);
          }
          return uri;
        });
      }
    }

    // Add URIs to Target Kind.
    if (droppedUris?.length) {
      const kind = target?.kind || vscode.workspace.workspaceFolders?.length ? 'workspace' : 'global';
      await this.bookmarkManager.addBookmarksAsync(droppedUris, kind);
    }

    // Remove Bookmarks that were dragged
    if (draggedBookmarks?.length) {
      await this.bookmarkManager.removeBookmarksAsync(draggedBookmarks);
    }
  }
}