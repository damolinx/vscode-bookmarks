import * as vscode from 'vscode';
import { Bookmark } from '../bookmark';
import { BookmarkContainer } from '../bookmarkContainer';
import { NaturalComparer } from './treeUtils';

export type TreeItemOverrides = Pick<
  vscode.TreeItem,
  'label' | 'description' | 'iconPath' | 'tooltip'
>;

export abstract class TreeItemProvider {
  protected abstract compareBookmarks(a: Bookmark, b: Bookmark): number;

  protected abstract getBookmarkOverrides(bookmark: Bookmark): TreeItemOverrides;

  protected getBookmarkContainerOverrides(_container: BookmarkContainer): TreeItemOverrides {
    return {};
  }

  public getTreeItem(item: Bookmark | BookmarkContainer): vscode.TreeItem {
    let treeItem: vscode.TreeItem;
    if (item instanceof BookmarkContainer) {
      treeItem = this.getTreeItemForBookmarkContainer(item);
    } else {
      treeItem = this.getTreeItemForBookmark(item);
    }
    return treeItem;
  }

  public getTreeItemForBookmark(bookmark: Bookmark): vscode.TreeItem {
    const overrides = this.getBookmarkOverrides(bookmark);
    const treeItem: vscode.TreeItem = new vscode.TreeItem(overrides.label || bookmark.defaultName);

    treeItem.command = {
      title: 'Open',
      command: '_bookmarks.open',
      arguments: [bookmark],
    };

    treeItem.contextValue = 'bookmark';
    if (bookmark.lineMoniker === 'cell') {
      treeItem.contextValue += ';noline';
    }

    treeItem.id = bookmark.id;
    treeItem.resourceUri = bookmark.uri;

    if (overrides.description) {
      treeItem.description = overrides.description;
    }
    if (overrides.iconPath) {
      treeItem.iconPath = overrides.iconPath;
    }
    if (overrides.tooltip) {
      treeItem.tooltip = overrides.tooltip;
    } else if (bookmark.notes) {
      treeItem.tooltip = new vscode.MarkdownString(
        `${bookmark.uri.fsPath}  \n**Notes:** `,
      ).appendText(bookmark.notes);
    }
    return treeItem;
  }

  public getTreeItemForBookmarkContainer(container: BookmarkContainer): vscode.TreeItem {
    const overrides = this.getBookmarkContainerOverrides(container);
    const treeItem: vscode.TreeItem = new vscode.TreeItem(
      overrides.label || container.displayName,
      vscode.TreeItemCollapsibleState.Expanded,
    );

    treeItem.contextValue = 'bookmarkContainer';
    treeItem.id = container.id;

    if (container.isRoot) {
      treeItem.contextValue += ';root';
    }

    if (overrides.description) {
      treeItem.description = overrides.description;
    }
    if (overrides.iconPath) {
      treeItem.iconPath = overrides.iconPath;
    }
    if (overrides.tooltip) {
      treeItem.tooltip = overrides.tooltip;
    }
    return treeItem;
  }

  public sort(elements: (Bookmark | BookmarkContainer)[]): (Bookmark | BookmarkContainer)[] {
    return elements.sort((a, b) => {
      const aIsContainer = a instanceof BookmarkContainer;
      const bIsContainer = b instanceof BookmarkContainer;
      let order: number;
      if (aIsContainer && bIsContainer) {
        return NaturalComparer.compare(a.displayName, b.displayName);
      } else if (aIsContainer) {
        order = -1;
      } else if (bIsContainer) {
        order = 1;
      } else {
        order = this.compareBookmarks(a, b);
      }
      return order;
    });
  }
}
