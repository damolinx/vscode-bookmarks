import * as vscode from "vscode";
import { Bookmark, BookmarkKind } from "./bookmark";
import { BookmarkManager } from "./bookmarkManager";

export class BookmarkGroup {
  constructor(public readonly name: string,
    public readonly kind: BookmarkKind) {

  }
}

export class BookmarkTreeProvider implements vscode.Disposable, vscode.TreeDataProvider<Bookmark | BookmarkGroup> {

  private readonly onDidChangeTreeDataEmitter: vscode.EventEmitter<void | Bookmark>;

  constructor(private readonly manager: BookmarkManager) {
    this.onDidChangeTreeDataEmitter = new vscode.EventEmitter<void | Bookmark>();
    this.manager.onDidAddBookmark(() => this.refresh());
    this.manager.onDidRemoveBookmark(() => this.refresh());
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
   * Get {@link TreeItem} representation of the `bookmark`.
   * @param bookmark The bookmark for which {@link TreeItem} representation is asked for.
   * @return TreeItem representation of the bookmark.
   */
  public getTreeItem(element: Bookmark | BookmarkGroup): vscode.TreeItem | Thenable<vscode.TreeItem> {
    const treeItem: vscode.TreeItem = new vscode.TreeItem(element.name);
    if (element instanceof Bookmark) {
      treeItem.command = {
        title: "Open",
        command: "vscode.open",
        tooltip: `Open ${element.name}`,
        arguments: [element.uri],
      };
      treeItem.contextValue = 'bookmark';
      treeItem.resourceUri = element.uri;
    } else {
      treeItem.contextValue = `bookmarkGroup`;
      treeItem.collapsibleState = this.manager.hasBookmarks(element.kind) 
        ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None;
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
      children = [new BookmarkGroup('Global', 'global')];
      if (vscode.workspace.workspaceFolders?.length) {
        children.push(new BookmarkGroup('Workspace', 'workspace'));
      }
    } else {
      children = this.manager.getBookmarks(element.kind).sort((a, b) => a.name.localeCompare(b.name));
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