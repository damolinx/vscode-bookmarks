import * as vscode from 'vscode';
import { Bookmark, BookmarkKind } from './bookmark';
import { BookmarkManager } from './bookmarkManager';
import { BookmarkGroup, BookmarkTreeProvider } from './bookmarkTreeProvider';

/**
 * Extension startup. 
 * @param context Context.
 */
export function activate(context: vscode.ExtensionContext) {

  const bookmarkManager = new BookmarkManager(context);
  const bookmarkTreeProvider = new BookmarkTreeProvider(bookmarkManager);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('bookmarks', bookmarkTreeProvider));
  context.subscriptions.push(bookmarkTreeProvider);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "bookmarks.addBookmark",
      async (pathOrGroup?: string | vscode.Uri | BookmarkGroup, kind?: BookmarkKind) => {
        let uri: vscode.Uri | undefined;

        if (pathOrGroup instanceof vscode.Uri) {
          uri = pathOrGroup;
        } else if (typeof pathOrGroup === "string") {
          uri = vscode.Uri.parse(pathOrGroup);
        } else if (pathOrGroup instanceof BookmarkGroup) {
          uri = vscode.window.activeTextEditor?.document.uri;
          kind = pathOrGroup.kind;
        }

        if (uri) {
          await bookmarkManager.addBookmarkAsync(uri, kind);
        } else {
          vscode.window.showWarningMessage("Found no open editor nor received a URI to bookmark");
        }
      }));

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      // This ensures node names include/exclude workspace name based on what workspace folders.
      bookmarkTreeProvider.refresh();
    }));

  vscode.commands.registerCommand(
    "bookmarks.removeBookmark",
    (bookmark: Bookmark) => bookmarkManager.removeBookmarkAsync(bookmark));

  vscode.commands.registerCommand(
    "bookmarks.removeAllBookmarks",
    async (group?: BookmarkKind | BookmarkGroup) => {
      const kind = (group instanceof BookmarkGroup) ? group.kind : group;
      if (bookmarkManager.hasBookmarks(kind)) {
        const option = await vscode.window.showInformationMessage("Are you sure you want to remove all bookmarks?", "Yes", "No");
        if (option === "Yes") {
          await bookmarkManager.removeAllBookmarksAsync(kind);
        }
      }
    });
}