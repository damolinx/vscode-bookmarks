import * as vscode from 'vscode';
import * as path from 'path';
import { Bookmark, BOOKMARK_DISPLAY_NAME_KEY } from '../bookmark';
import { TreeItemOverrides, TreeItemProvider } from './treeItemProvider';
import { NaturalComparer } from './treeUtils';

export class NameTreeItemProvider extends TreeItemProvider {
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
        description: `…${path.sep}${path.join(...bookmarkPath.split(path.sep).splice(-3, 2))}`,
        label: `${path.basename(bookmarkPath)}:${bookmark.start}${bookmark.end ? `-${bookmark.end}` : ''}`,
      };
    }
    return treeItemOverrides;
  }

  protected compareBookmarks(a: Bookmark, b: Bookmark): number {
    const a1 =
      (a.metadata[BOOKMARK_DISPLAY_NAME_KEY] as string | undefined) || path.basename(a.uri.fsPath);
    const a2 = a1 || a.uri.fsPath;
    const b1 =
      (b.metadata[BOOKMARK_DISPLAY_NAME_KEY] as string | undefined) || path.basename(b.uri.fsPath);
    const b2 = b1 || b.uri.fsPath;

    return (
      NaturalComparer.compare(a1, b1) ||
      NaturalComparer.compare(a2, b2) ||
      a.start - b.start ||
      (a.end ?? 0) - (b.end ?? 0)
    );
  }
}
