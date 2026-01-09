import * as vscode from 'vscode';
import { existsSync, statSync } from 'fs';
import { Bookmark } from './bookmark';
import { BookmarkContainer } from './bookmarkContainer';
import { BookmarkManager } from './bookmarkManager';
import { BookmarkTreeItem } from './bookmarkTreeProvider';

export class BookmarkTreeDragAndDropController implements vscode.TreeDragAndDropController<BookmarkTreeItem> {
  private readonly bookmarkManager: BookmarkManager;
  public readonly dropMimeTypes: readonly string[];
  public readonly dragMimeTypes: readonly string[];

  constructor(bookmarkManager: BookmarkManager) {
    this.bookmarkManager = bookmarkManager;
    this.dragMimeTypes = [];
    this.dropMimeTypes = ['application/vnd.code.tree.bookmarks', 'text/uri-list'];
  }

  private getTargetContainer(target: BookmarkTreeItem | undefined) {
    return target instanceof BookmarkContainer
      ? target
      : (target?.container ??
          this.bookmarkManager.getRootContainer(
            vscode.workspace.workspaceFolders?.length ? 'workspace' : 'global',
          ));
  }

  public async handleDrag(
    source: BookmarkTreeItem[],
    treeDataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const items = source.filter((s) => s instanceof Bookmark || !s.isRoot);
    if (items.length) {
      treeDataTransfer.set(
        'application/vnd.code.tree.bookmarks',
        new vscode.DataTransferItem(items),
      );
    }
  }

  public async handleDrop(
    target: BookmarkTreeItem | undefined,
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const targetContainer = this.getTargetContainer(target);

    // DO NOT process all mimeTypes blindly: dragging af tree node automatically
    // adds 'text/uri-list' on top of 'application/vnd.code.tree.bookmarks'. The
    // former is intended only for editor drops.

    let item: vscode.DataTransferItem | undefined;

    item = dataTransfer.get('application/vnd.code.tree.bookmarks');
    if (item) {
      const items: (Bookmark | BookmarkContainer)[] = item.value;
      await this.bookmarkManager.moveAsync(targetContainer, ...items);
      return;
    }

    item = dataTransfer.get('text/uri-list');
    if (item) {
      const uris = (await item.asString())
        .split('\r\n')
        .map((uriStr) => vscode.Uri.parse(uriStr, true))
        .filter(
          (uri) =>
            uri.scheme !== 'file' || !existsSync(uri.fsPath) || statSync(uri.fsPath).isFile(),
        )
        .map((uri) => ({
          uri: uri.with({ fragment: 'L1' }),
        }));
      await this.bookmarkManager.addAsync(targetContainer, ...uris);
    }
  }
}
