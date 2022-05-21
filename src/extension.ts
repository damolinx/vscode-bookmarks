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
  const bookmarkTreeView = vscode.window.createTreeView('bookmarks', {
    treeDataProvider: bookmarkTreeProvider,
    // TODO: dragAndDropController?: TreeDragAndDropController<T>;    
  });

  // Set up Tree View
  context.subscriptions.push(
    bookmarkManager,
    bookmarkTreeProvider,
    bookmarkTreeView,
    // This ensures node names reflect current workspaces.
    vscode.workspace.onDidChangeWorkspaceFolders(() => bookmarkTreeProvider.refresh()));

  // Register Commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "_bookmarks.addBookmark",
      async (pathOrUri: string | vscode.Uri | undefined, kind: BookmarkKind) => {
        const uri: vscode.Uri | undefined = (pathOrUri instanceof vscode.Uri)
          ? pathOrUri
          : (typeof pathOrUri === "string")
            ? vscode.Uri.parse(pathOrUri)
            : vscode.window.activeTextEditor?.document.uri;
        if (uri) {
          const bookmark = await bookmarkManager.addBookmarkAsync(uri, kind);
          bookmarkTreeView.reveal(bookmark);
        }
      }),
    vscode.commands.registerCommand(
      "bookmarks.addBookmark.global",
      (pathOrUri?: string | vscode.Uri) =>
        vscode.commands.executeCommand("_bookmarks.addBookmark", pathOrUri, 'global')),
    vscode.commands.registerCommand(
      "bookmarks.addBookmark.tree",
      (group: BookmarkGroup) =>
        vscode.commands.executeCommand("_bookmarks.addBookmark", undefined, group.kind)),
    vscode.commands.registerCommand(
      "bookmarks.addBookmark.workspace",
      (pathOrUri?: string | vscode.Uri) =>
        vscode.commands.executeCommand("_bookmarks.addBookmark", pathOrUri, 'workspace')),
    vscode.commands.registerCommand(
      "bookmarks.removeBookmark",
      (bookmark: Bookmark) => bookmarkManager.removeBookmarkAsync(bookmark)));
}