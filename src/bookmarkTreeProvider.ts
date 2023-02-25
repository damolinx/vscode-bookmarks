import * as vscode from "vscode";
import * as path from "path";
import { Bookmark } from "./bookmark";
import { BookmarkGroup } from "./bookmarkGroup";
import { BookmarkManager } from "./bookmarkManager";

export class BookmarkTreeProvider implements vscode.Disposable, vscode.TreeDataProvider<Bookmark | BookmarkGroup> {

  private readonly manager: BookmarkManager;
  private readonly onDidChangeTreeDataEmitter: vscode.EventEmitter<void | Bookmark>;

  /**
   * Constructor.
   * @param manager Bookmark manager.
   */
  constructor(manager: BookmarkManager) {
    this.manager = manager;
    this.manager.onDidAddBookmark(() => this.refresh());
    this.manager.onDidChangeBookmark(() => this.refresh());
    this.manager.onDidRemoveBookmark(() => this.refresh());
    this.onDidChangeTreeDataEmitter = new vscode.EventEmitter<void | Bookmark>();
  }

  /**
   * Dispose this object.
   */
  public dispose() {
    this.onDidChangeTreeDataEmitter.dispose();
  }

  /**
   * Event to signal that bookmarks have changed.
   */
  public get onDidChangeTreeData(): vscode.Event<void | Bookmark> {
    return this.onDidChangeTreeDataEmitter.event;
  }

  /**
   * Get parent of `element`.
   * @param element The element for which the parent has to be returned.
   * @return Parent of `element`, or undefined if it is a root.
   */
  public getParent(element: Bookmark | BookmarkGroup): vscode.ProviderResult<BookmarkGroup | undefined> {
    const group = (element instanceof Bookmark)
      ? this.manager.getBookmarkGroup(element.kind)
      : undefined;
    return group;
  }

  /**
   * Get {@link TreeItem} representation of the `bookmark`.
   * @param bookmark The bookmark for which {@link TreeItem} representation is asked for.
   * @return TreeItem representation of the bookmark.
   */
  public getTreeItem(element: Bookmark | BookmarkGroup): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const treeItem: vscode.TreeItem = new vscode.TreeItem(element.displayName);
    if (element instanceof Bookmark) {
      treeItem.command = {
        title: "Open",
        command: "vscode.open",
        tooltip: `Open ${element.displayName}`,
        arguments: [element.uri],
      };
      treeItem.contextValue = 'bookmark';
      treeItem.resourceUri = element.uri;
      treeItem.tooltip = element.defaultName;

      if (element.hasDisplayName) {
        let description = `…${path.join(...element.uri.fsPath.split(path.sep).splice(-2))}`;
        if (element.hasLineNumer) {
          description += `:${element.lineNumber}`;
        }
        treeItem.description = description;
      }

    } else {
      treeItem.contextValue = `bookmarkGroup`;
      treeItem.collapsibleState = this.manager.hasBookmarks(element.kind)
        ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
    }
    return treeItem;
  }

  /**
   * Get the children of `element` or root if no element is passed.
   * @param element The element from which the provider gets children. Can be `undefined`.
   * @return Children of `element` or root if no element is passed.
   */
  public getChildren(element?: BookmarkGroup): vscode.ProviderResult<Bookmark[] | BookmarkGroup[]> {
    let children: Bookmark[] | BookmarkGroup[];
    if (!element) {
      children = [this.manager.getBookmarkGroup('global')!];
      if (vscode.workspace.workspaceFolders?.length) {
        children.push(this.manager.getBookmarkGroup('workspace')!);
      }
    } else {
      children = this.manager.getBookmarks({ kind: element.kind })
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
    return children;
  }

  /**
   * Refresh tree, or bookmark node.
   * @param bookmark Bookmark to refresh.
   */
  public refresh(bookmark?: Bookmark) {
    this.onDidChangeTreeDataEmitter.fire(bookmark);
  }
}