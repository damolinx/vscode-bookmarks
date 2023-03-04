import * as vscode from 'vscode';
import { Bookmark } from './bookmark';
import { BookmarkGroup } from './bookmarkGroup';
import { BookmarkManager } from './bookmarkManager';

type EventType = undefined | Bookmark | Bookmark[];

export class BookmarkTreeProvider
  implements vscode.Disposable, vscode.TreeDataProvider<Bookmark | BookmarkGroup>
{
  private readonly disposable: vscode.Disposable;
  private readonly manager: BookmarkManager;
  public readonly onDidChangeTreeData: vscode.Event<EventType>;
  private readonly onDidChangeTreeDataEmitter: vscode.EventEmitter<EventType>;

  /**
   * Constructor.
   * @param manager Bookmark manager.
   */
  constructor(manager: BookmarkManager) {
    this.manager = manager;
    this.onDidChangeTreeDataEmitter = new vscode.EventEmitter<EventType>();
    this.onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    this.disposable = vscode.Disposable.from(
      this.manager.onDidAddBookmark(() => this.refresh()),
      this.manager.onDidChangeBookmark(() => this.refresh()),
      this.manager.onDidRemoveBookmark(() => this.refresh()),
      this.onDidChangeTreeDataEmitter
    );
  }

  /**
   * Dispose this object.
   */
  public dispose() {
    this.disposable.dispose();
  }

  /**
   * Get parent of `element`.
   * @param element The element for which the parent has to be returned.
   * @return Parent of `element`, or `undefined` if it is a root.
   */
  public getParent(
    element: Bookmark | BookmarkGroup
  ): vscode.ProviderResult<BookmarkGroup | undefined> {
    const group =
      element instanceof Bookmark ? this.manager.getBookmarkGroup(element.kind) : undefined;
    return group;
  }

  /**
   * Get {@link TreeItem} representation of  `element`.
   * @param element The element for which {@link TreeItem} representation is asked for.
   * @return TreeItem representation of the bookmark.
   */
  public getTreeItem(
    element: Bookmark | BookmarkGroup
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const treeItem: vscode.TreeItem = new vscode.TreeItem(element.displayName);
    if (element instanceof Bookmark) {
      treeItem.command = {
        title: 'Open',
        command: 'vscode.open',
        arguments: [element.uri],
      };
      treeItem.contextValue = 'bookmark';
      treeItem.description = element.description;
      treeItem.resourceUri = element.uri;
      treeItem.tooltip = element.defaultName;
    } else {
      treeItem.contextValue = `bookmarkGroup`;
      treeItem.collapsibleState = this.manager.hasBookmarks(element.kind)
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.Collapsed;
    }
    return treeItem;
  }

  /**
   * Get the children of `element` or root if no element is passed.
   * @param element The element from which the provider gets children. Can be `undefined`.
   * @return Children of `element` or root if no element is passed.
   */
  public getChildren(
    element?: BookmarkGroup
  ): vscode.ProviderResult<Bookmark[] | BookmarkGroup[]> {
    let children: Bookmark[] | BookmarkGroup[];
    if (!element) {
      children = [this.manager.getBookmarkGroup('global')!];
      if (vscode.workspace.workspaceFolders?.length) {
        children.push(this.manager.getBookmarkGroup('workspace')!);
      }
    } else {
      children = this.manager
        .getBookmarks({ kind: element.kind })
        .sort((a, b) => a.compare(b));
    }
    return children;
  }

  /**
   * Refresh tree.
   * @param data Bookmark(s) to refresh. If `undefined`, it means refresh from the root.
   */
  public refresh(data?: Bookmark | Bookmark[]) {
    this.onDidChangeTreeDataEmitter.fire(data);
  }
}
