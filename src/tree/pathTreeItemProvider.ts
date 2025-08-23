import * as vscode from 'vscode';
import * as path from 'path';
import { Bookmark, BOOKMARK_DISPLAY_NAME_KEY } from '../bookmark';
import { TreeItemOverrides, TreeItemProvider } from './treeItemProvider';
import { NaturalComparer } from './treeUtils';

export class PathTreeItemProvider extends TreeItemProvider {
  protected getBookmarkOverrides(bookmark: Bookmark): TreeItemOverrides {
    const bookmarkPath = bookmark.uri.fsPath;
    const displayName = bookmark.metadata[BOOKMARK_DISPLAY_NAME_KEY] as string | undefined;

    let treeItemOverrides: Partial<vscode.TreeItem>;
    if (displayName) {
      treeItemOverrides = {
        description: `…${path.join(...bookmarkPath.split(path.sep).splice(-3))}:${bookmark.lineNumber}`,
        label: displayName,
      };
    } else {
      treeItemOverrides = {
        description: `${bookmark.lineMoniker} ${bookmark.lineNumber}`,
        label:
          bookmark.defaultName !== bookmarkPath || vscode.workspace.workspaceFolders?.length !== 1
            ? bookmark.defaultName
            : path.relative(vscode.workspace.workspaceFolders[0]!.uri.fsPath, bookmarkPath),
      };
    }
    return treeItemOverrides;
  }

  protected compareBookmarks(a: Bookmark, b: Bookmark): number {
    const a1 = (a.metadata[BOOKMARK_DISPLAY_NAME_KEY] as string | undefined) || a.uri.fsPath;
    const b1 = (b.metadata[BOOKMARK_DISPLAY_NAME_KEY] as string | undefined) || b.uri.fsPath;

    return NaturalComparer.compare(a1, b1) || a.lineNumber - b.lineNumber;
  }
}
