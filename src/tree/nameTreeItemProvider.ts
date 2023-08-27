import * as vscode from 'vscode';
import * as path from 'path';
import { Bookmark, BOOKMARK_DISPLAY_NAME_KEY } from '../bookmark';
import { TreeItemOverrides, TreeItemProvider } from './treeItemProvider';

export class NameTreeItemProvider extends TreeItemProvider {
  protected getBookmarkOverrides(bookmark: Bookmark): TreeItemOverrides {
    const bookmarkPath = bookmark.uri.fsPath;
    const displayName = <string | undefined>bookmark.metadata[BOOKMARK_DISPLAY_NAME_KEY];

    let treeItemOverrides: Partial<vscode.TreeItem>;
    if (displayName) {
      treeItemOverrides = {
        description: `…${path.join(...bookmarkPath.split(path.sep).splice(-3))}:${
          bookmark.lineNumber
        }`,
        label: displayName,
      };
    } else {
      treeItemOverrides = {
        description: `…${path.sep}${path.join(
          ...bookmarkPath.split(path.sep).splice(-3, 2),
        )}`,
        label: `${path.basename(bookmarkPath)}:${bookmark.lineNumber}`,
      };
    }
    return treeItemOverrides;
  }

  protected compareBookmarks(a: Bookmark, b: Bookmark): number {
    const a1 =
      <string | undefined>a.metadata[BOOKMARK_DISPLAY_NAME_KEY] ||
      path.basename(a.uri.fsPath);
    const a2 = a1 || a.uri.fsPath;
    const b1 =
      <string | undefined>b.metadata[BOOKMARK_DISPLAY_NAME_KEY] ||
      path.basename(b.uri.fsPath);
    const b2 = b1 || b.uri.fsPath;

    return (
      a1.localeCompare(b1, undefined, { sensitivity: 'base' }) ||
      a2.localeCompare(b2, undefined, { sensitivity: 'base' }) ||
      a.lineNumber - b.lineNumber
    );
  }
}
