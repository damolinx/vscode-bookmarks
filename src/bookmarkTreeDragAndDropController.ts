import * as vscode from 'vscode';
import { Bookmark } from './bookmark';
import { BookmarkManager } from './bookmarkManager';
import { BookmarkTreeItem } from './bookmarkTreeProvider';
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

  private getTargetContainer(target: BookmarkTreeItem | undefined) {
    return target instanceof BookmarkContainer
      ? target
      : target?.container ??
          this.bookmarkManager.getRootContainer(
            vscode.workspace.workspaceFolders?.length ? 'workspace' : 'global',
          );
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
    dataTransfer.forEach(async (item, mimeType) => {
      switch (mimeType) {
        case 'application/vnd.code.tree.bookmarks':
          const items: Array<Bookmark | BookmarkContainer> = item.value;
          await this.bookmarkManager.moveAsync(targetContainer, ...items);
          break;
        case 'text/uri-list':
          const uris = (await item.asString())
            .split('n')
            .map((uriStr) => ({ uri: vscode.Uri.parse(uriStr + '#L1', true) }));
          await this.bookmarkManager.addAsync(targetContainer, ...uris);
          break;
      }
    });
  }
}
