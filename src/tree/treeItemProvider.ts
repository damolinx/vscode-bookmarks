import * as vscode from 'vscode';
import { Bookmark } from '../bookmark';
import { BookmarkContainer } from '../bookmarkContainer';

export abstract class TreeItemProvider {
  protected abstract compareBookmarks(a: Bookmark, b: Bookmark): number;

  protected abstract getBookmarkOverrides(
    bookmark: Bookmark
  ): Pick<vscode.TreeItem, 'label' | 'description' | 'iconPath' | 'tooltip'>;

  protected getBookmarkContainerOverrides(
    _container: BookmarkContainer
  ): Pick<vscode.TreeItem, 'label' | 'description' | 'iconPath' | 'tooltip'> {
    return {};
  }

  public getTreeItemForBookmark(bookmark: Bookmark): vscode.TreeItem {
    const overrides = this.getBookmarkOverrides(bookmark);
    const treeItem: vscode.TreeItem = new vscode.TreeItem(
      overrides.label || bookmark.defaultName
    );
    treeItem.command = {
      title: 'Open',
      command: 'vscode.open',
      arguments: [bookmark.uri],
    };
    treeItem.contextValue = 'bookmark';
    treeItem.resourceUri = bookmark.uri;

    if (overrides.description) {
      treeItem.description = overrides.description;
    }
    if (overrides.iconPath) {
      treeItem.iconPath = overrides.iconPath;
    }
    if (treeItem.tooltip) {
      treeItem.tooltip = overrides.tooltip;
    }
    return treeItem;
  }

  public getTreeItemForBookmarkContainer(container: BookmarkContainer): vscode.TreeItem {
    const overrides = this.getBookmarkContainerOverrides(container);
    const treeItem: vscode.TreeItem = new vscode.TreeItem(
      overrides.label || container.displayName,
      vscode.TreeItemCollapsibleState.Expanded
    );
    treeItem.contextValue = 'bookmarkFolder';

    if (overrides.description) {
      treeItem.description = overrides.description;
    }
    if (overrides.iconPath) {
      treeItem.iconPath = overrides.iconPath;
    }
    if (treeItem.tooltip) {
      treeItem.tooltip = overrides.tooltip;
    }
    return treeItem;
  }

  public sort(
    elements: Array<Bookmark | BookmarkContainer>
  ): Array<Bookmark | BookmarkContainer> {
    return elements.sort((a, b) => {
      const aIsFolder = a instanceof BookmarkContainer;
      const bIsFolder = b instanceof BookmarkContainer;
      let order: number;
      if (aIsFolder && bIsFolder) {
        return a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: 'base',
        });
      } else if (aIsFolder) {
        order = -1;
      } else if (bIsFolder) {
        order = 1;
      } else {
        order = this.compareBookmarks(a, b);
      }
      return order;
    });
  }
}
