import * as vscode from 'vscode';
import { Bookmark } from './bookmark';
import { BookmarkContainer } from './bookmarkContainer';
import { BookmarkManager } from './bookmarkManager';
import { TreeItemProvider } from './tree/treeItemProvider';
import { createTreeProvider, TreeViewKind } from './tree/treeUtils';

const VIEW_CONTEXT_KEY = 'bookmarks.tree.view';
const VIEW_PREFERENCE_KEY = 'bookmarks.treeLabelMode';

export type BookmarkTreeItem = Bookmark | BookmarkContainer;
export type EventType = undefined | BookmarkTreeItem | BookmarkTreeItem[];

export class BookmarkTreeProvider
  implements vscode.Disposable, vscode.TreeDataProvider<BookmarkTreeItem>
{
  private readonly disposables: vscode.Disposable[];
  private readonly manager: BookmarkManager;
  public readonly onDidChangeTreeData: vscode.Event<EventType>;
  private readonly onDidChangeTreeDataEmitter: vscode.EventEmitter<EventType>;
  private treeItemProvider: Readonly<{ kind: TreeViewKind; provider: TreeItemProvider }>;

  /**
   * Constructor.
   * @param context Extension context.
   * @param manager Bookmark manager.
   */
  constructor(manager: BookmarkManager) {
    this.manager = manager;
    this.onDidChangeTreeDataEmitter = new vscode.EventEmitter<EventType>();
    this.onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    const kind = vscode.workspace.getConfiguration().get<TreeViewKind>(VIEW_PREFERENCE_KEY, 'name');
    this.treeItemProvider = { kind, provider: createTreeProvider(kind) };
    vscode.commands.executeCommand('setContext', VIEW_CONTEXT_KEY, kind);

    this.disposables = [
      this.manager.onDidAddBookmark(() => this.refresh()),
      this.manager.onDidChangeBookmark(() => this.refresh()),
      this.manager.onDidRemoveBookmark(() => this.refresh()),
      this.onDidChangeTreeDataEmitter,
      vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration(VIEW_PREFERENCE_KEY)) {
          await this.setViewKind(
            vscode.workspace.getConfiguration().get<TreeViewKind>(VIEW_PREFERENCE_KEY, 'name'),
          );
        }
      }),
    ];
  }

  /**
   * Dispose this object.
   */
  public dispose() {
    vscode.Disposable.from(...this.disposables).dispose();
  }

  /**
   * Get parent of `element`.
   * @param element The element for which the parent has to be returned.
   * @return Parent of `element`, or `undefined` if it is a root.
   */
  public getParent(
    element: BookmarkTreeItem,
  ): vscode.ProviderResult<BookmarkContainer | undefined> {
    const container =
      element instanceof Bookmark ? this.manager.getRootContainer(element.kind) : undefined;
    return container;
  }

  /**
   * Get {@link TreeItem} representation of `element`.
   * @param element The element for which {@link TreeItem} representation is asked for.
   * @return TreeItem representation of the bookmark.
   */
  public getTreeItem(element: BookmarkTreeItem): vscode.TreeItem {
    const treeItem = this.treeItemProvider.provider.getTreeItem(element);
    return treeItem;
  }

  /**
   * Get the children of `element` or root if no element is passed.
   * @param element The element from which the provider gets children. Can be `undefined`.
   * @return Children of `element` or root if no element is passed.
   */
  public getChildren(element?: BookmarkContainer): BookmarkTreeItem[] {
    let children: BookmarkTreeItem[];
    if (element) {
      children = this.treeItemProvider.provider.sort(element.getItems());
    } else {
      children = [this.manager.getRootContainer('global')];
      if (vscode.workspace.workspaceFolders?.length) {
        children.push(this.manager.getRootContainer('workspace'));
      }
    }
    return children;
  }

  /**
   * Refresh tree.
   * @param data Bookmark(s) to refresh. If `undefined`, it means refresh from the root.
   */
  public refresh(data?: BookmarkTreeItem | BookmarkTreeItem[]) {
    this.onDidChangeTreeDataEmitter.fire(data);
  }

  /**
   * Get current view mode.
   */
  public get viewKind(): TreeViewKind {
    return this.treeItemProvider.kind;
  }

  /**
   * Set current view kind. If mode is changed, tree will be refreshed.
   */
  public async setViewKind(kind: TreeViewKind): Promise<void> {
    if (this.treeItemProvider.kind === kind) {
      return;
    }

    this.treeItemProvider = { kind, provider: createTreeProvider(kind) };
    await Promise.all([
      vscode.commands.executeCommand('setContext', VIEW_CONTEXT_KEY, kind),
      vscode.workspace
        .getConfiguration()
        .update(VIEW_PREFERENCE_KEY, kind, vscode.ConfigurationTarget.Global),
    ]);

    this.refresh();
  }
}
