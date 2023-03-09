import * as vscode from 'vscode';
import * as path from 'path';
import { Bookmark, BOOKMARK_CUSTOM_NAME_METADATA_KEY } from '../bookmark';
import { TreeItemProvider } from './treeItemProvider';

export class PathTreeItemProvider extends TreeItemProvider {
  constructor() {
    super('path');
  }

  protected getBookmarkOverrides(bookmark: Bookmark): Partial<vscode.TreeItem> {
    const bookmarkPath = bookmark.uri.fsPath;
    const displayName = <string | undefined>(
      bookmark.metadata[BOOKMARK_CUSTOM_NAME_METADATA_KEY]
    );

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
        description: `line ${bookmark.lineNumber}`,
        label:
          bookmark.defaultName !== bookmarkPath ||
          vscode.workspace.workspaceFolders?.length !== 1
            ? bookmark.defaultName
            : path.relative(vscode.workspace.workspaceFolders[0]!.uri.fsPath, bookmarkPath),
      };
    }
    return treeItemOverrides;
  }

  public sort(elements: Bookmark[]): Bookmark[] {
    return elements.sort((a, b) => {
      const a1 =
        <string | undefined>a.metadata[BOOKMARK_CUSTOM_NAME_METADATA_KEY] || a.uri.fsPath;
      const b1 =
        <string | undefined>b.metadata[BOOKMARK_CUSTOM_NAME_METADATA_KEY] || b.uri.fsPath;

      return (
        a1.localeCompare(b1, undefined, { sensitivity: 'base' }) ||
        a.lineNumber - b.lineNumber
      );
    });
  }
}
