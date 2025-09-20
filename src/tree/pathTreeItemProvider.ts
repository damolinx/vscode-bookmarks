import * as vscode from 'vscode';
import * as path from 'path';
import { Bookmark, BOOKMARK_DISPLAY_NAME_KEY } from '../bookmark';
import { TreeItemOverrides, TreeItemProvider } from './treeItemProvider';

export class PathTreeItemProvider extends TreeItemProvider {
  protected getBookmarkOverrides(bookmark: Bookmark): TreeItemOverrides {
    const bookmarkPath = bookmark.uri.fsPath;
    const displayName = bookmark.metadata[BOOKMARK_DISPLAY_NAME_KEY] as string | undefined;

    let treeItemOverrides: Partial<vscode.TreeItem>;
    if (displayName) {
      treeItemOverrides = {
        description: `…${path.join(...bookmarkPath.split(path.sep).splice(-3))}:${bookmark.start}${bookmark.end ? `-${bookmark.end}` : ''}`,
        label: displayName,
      };
    } else {
      treeItemOverrides = {
        description: bookmark.getDescription(),
        label:
          bookmark.defaultName !== bookmarkPath || vscode.workspace.workspaceFolders?.length !== 1
            ? bookmark.defaultName
            : path.relative(vscode.workspace.workspaceFolders[0]!.uri.fsPath, bookmarkPath),
      };
    }
    return treeItemOverrides;
  }

  protected compareBookmarks(a: Bookmark, b: Bookmark): number {
    return a.compare(b);
  }
}
