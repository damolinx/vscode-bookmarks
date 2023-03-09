import * as vscode from 'vscode';
import * as path from 'path';
import { Bookmark, BOOKMARK_CUSTOM_NAME_METADATA_KEY } from '../bookmark';
import { TreeItemProvider } from './treeItemProvider';

export class NameTreeItemProvider extends TreeItemProvider {
  constructor() {
    super('name');
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
        description: `…${path.sep}${path.join(
          ...bookmarkPath.split(path.sep).splice(-3, 2)
        )}`,
        label: `${path.basename(bookmarkPath)}:${bookmark.lineNumber}`,
      };
    }
    return treeItemOverrides;
  }

  public sort(elements: Bookmark[]): Bookmark[] {
    return elements.sort((a, b) => {
      const a1 =
        <string | undefined>a.metadata[BOOKMARK_CUSTOM_NAME_METADATA_KEY] ||
        path.basename(a.uri.fsPath);
      const a2 = a1 || a.uri.fsPath;
      const b1 =
        <string | undefined>b.metadata[BOOKMARK_CUSTOM_NAME_METADATA_KEY] ||
        path.basename(b.uri.fsPath);
      const b2 = b1 || b.uri.fsPath;

      return (
        a1.localeCompare(b1, undefined, { sensitivity: 'base' }) ||
        a2.localeCompare(b2, undefined, { sensitivity: 'base' }) ||
        a.lineNumber - b.lineNumber
      );
    });
  }
}
