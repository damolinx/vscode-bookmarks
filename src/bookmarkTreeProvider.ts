import * as vscode from 'vscode';
import { Bookmark } from './bookmark';
import { BookmarkGroup } from './bookmarkGroup';
import { BookmarkManager } from './bookmarkManager';
import { TreeItemProvider } from './tree/treeItemProvider';
import { createTreeProvider, TreeViewKind } from './tree/treeUtils';

type EventType = undefined | Bookmark | Bookmark[] | BookmarkGroup;

const VIEW_CONTEXT_KEY = 'bookmarks.tree.view';
const VIEW_MEMENTO_KEY = 'bookmarks.preferences.view';

export class BookmarkTreeProvider
  implements vscode.Disposable, vscode.TreeDataProvider<Bookmark | BookmarkGroup>
{
  private readonly context: vscode.ExtensionContext;
  private readonly disposable: vscode.Disposable;
  private readonly manager: BookmarkManager;
  public readonly onDidChangeTreeData: vscode.Event<EventType>;
  private readonly onDidChangeTreeDataEmitter: vscode.EventEmitter<EventType>;
  private treeItemProvider: Readonly<{ kind: TreeViewKind; provider: TreeItemProvider }>;

  /**
   * Constructor.
   * @param context Extension context.
   * @param manager Bookmark manager.
   */
  constructor(context: vscode.ExtensionContext, manager: BookmarkManager) {
    this.context = context;
    this.manager = manager;
    this.onDidChangeTreeDataEmitter = new vscode.EventEmitter<EventType>();
    this.onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    const kind = context.globalState.get<TreeViewKind>(VIEW_MEMENTO_KEY, 'path');
    this.treeItemProvider = { kind, provider: createTreeProvider(kind) };
    vscode.commands.executeCommand('setContext', VIEW_CONTEXT_KEY, kind);

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
   * Get {@link TreeItem} representation of `element`.
   * @param element The element for which {@link TreeItem} representation is asked for.
   * @return TreeItem representation of the bookmark.
   */
  public getTreeItem(
    element: Bookmark | BookmarkGroup
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    let treeItem: vscode.TreeItem;
    if (element instanceof BookmarkGroup) {
      treeItem = new vscode.TreeItem(
        element.displayName,
        element.count
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed
      );
      treeItem.contextValue = 'bookmarkGroup';
    } else {
      treeItem = this.treeItemProvider.provider.getTreeItemForBookmark(element);
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
      // TODO: Folder
      children = <Bookmark[]>(
        this.treeItemProvider.provider.sort(
          this.manager.getBookmarks({ kind: element.kind })
        )
      );
    }
    return children;
  }

  /**
   * Refresh tree.
   * @param data Bookmark(s) to refresh. If `undefined`, it means refresh from the root.
   */
  public refresh(data?: Bookmark | Bookmark[] | BookmarkGroup) {
    this.onDidChangeTreeDataEmitter.fire(data);
  }

  /**
   * Get current view mode.
   */
  public get viewKind(): TreeViewKind {
    return this.treeItemProvider.kind;
  }

  /**
   * Set current view kind.  If mode is change, tree will be refreshed.
   */
  public async setViewKind(kind: TreeViewKind): Promise<void> {
    if (this.treeItemProvider.kind !== kind) {
      this.treeItemProvider = { kind, provider: createTreeProvider(kind) };
      this.refresh();
      await Promise.all([
        vscode.commands.executeCommand('setContext', VIEW_CONTEXT_KEY, kind),
        this.context.globalState.update(VIEW_MEMENTO_KEY, kind),
      ]);
    }
  }
}
