import * as vscode from 'vscode';
import * as path from 'path';
import { Bookmark, BOOKMARK_CUSTOM_NAME_METADATA_KEY } from '../bookmark';
import { TreeItemProvider } from './treeItemProvider';

export class PathTreeItemProvider extends TreeItemProvider {
  constructor() {
    super('path');
  }

  protected getBookmarkOverrides(bookmark: Bookmark): Partial<vscode.TreeItem> {
    const displayName = <string | undefined>(
      bookmark.metadata[BOOKMARK_CUSTOM_NAME_METADATA_KEY]
    );

    let label: string;
    if (displayName) {
      label = displayName;
    } else {
      label =
        bookmark.defaultName !== bookmark.uri.fsPath ||
        vscode.workspace.workspaceFolders?.length !== 1
          ? bookmark.defaultName
          : path.relative(
              vscode.workspace.workspaceFolders[0]!.uri.fsPath,
              bookmark.uri.fsPath
            );
    }

    const description = `line ${bookmark.lineNumber}`;
    const treeItemOverrides: Partial<vscode.TreeItem> = {
      description,
      label,
    };
    return treeItemOverrides;
  }
}
