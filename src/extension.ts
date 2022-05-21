import * as vscode from 'vscode';
import { Bookmark, BookmarkKind } from './bookmark';
import { BookmarkGroup } from './bookmarkGroup';
import { BookmarkManager } from './bookmarkManager';
import { BookmarkTreeDragAndDropController } from './bookmarkTreeDragAndDropController';
import { BookmarkTreeProvider } from './bookmarkTreeProvider';

/**
 * Extension startup. 
 * @param context Context.
 */
export function activate(context: vscode.ExtensionContext) {

  const bookmarkManager = new BookmarkManager(context);
  const bookmarkTreeProvider = new BookmarkTreeProvider(bookmarkManager);
  const bookmarkTreeView = vscode.window.createTreeView('bookmarks', {
    dragAndDropController: new BookmarkTreeDragAndDropController(bookmarkManager),
    treeDataProvider: bookmarkTreeProvider,
  });

  // Set up Tree View
  context.subscriptions.push(
    bookmarkManager,
    bookmarkTreeProvider,
    bookmarkTreeView,
    // Ensures node names reflect current workspace by refreshing tree.
    vscode.workspace.onDidChangeWorkspaceFolders(
      () => bookmarkTreeProvider.refresh()),
    // Reveal a node when added.
    bookmarkManager.onDidAddBookmark(
      (bookmarks) =>  bookmarks && bookmarkTreeView.reveal(bookmarks[0])));

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
          if (!bookmark) {
            bookmarkTreeView.reveal(bookmarkManager.getBookmark(uri, kind));
          }
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