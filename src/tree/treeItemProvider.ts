import * as vscode from 'vscode';
import { Bookmark } from '../bookmark';

export abstract class TreeItemProvider {
  public readonly viewType: 'name' | 'path';

  constructor(viewType: 'name' | 'path') {
    this.viewType = viewType;
  }

  protected abstract getBookmarkOverrides(
    bookmark: Bookmark
  ): Pick<vscode.TreeItem, 'label' | 'description' | 'iconPath' | 'tooltip'>;

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

  public sort(elements: Bookmark[]): Bookmark[] {
    return elements.sort((a, b) => a.compare(b));
  }
}
