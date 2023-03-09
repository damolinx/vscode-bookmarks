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
}
