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
      async (bookmarks) => bookmarks && await bookmarkTreeView.reveal(bookmarks[0])));

  // Register Commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "_bookmarks.addBookmark",
      async (pathOrUriOrUndefined: string | vscode.Uri | undefined, kind: BookmarkKind): Promise<void> => {
        const pathOrUri: string | vscode.Uri | undefined = (pathOrUriOrUndefined)
          ? pathOrUriOrUndefined
          : vscode.window.activeTextEditor?.document.uri;
        if (pathOrUri) {
          const bookmark = await bookmarkManager.addBookmarkAsync(pathOrUri, kind);
          if (!bookmark) {
            bookmarkTreeView.reveal(bookmarkManager.getBookmark(pathOrUri, kind));
          }
        }
      }),
    vscode.commands.registerCommand(
      "bookmarks.addBookmark.global",
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        vscode.commands.executeCommand("_bookmarks.addBookmark", pathOrUri, 'global')),
    vscode.commands.registerCommand(
      "bookmarks.addBookmark.tree",
      (group: BookmarkGroup): Thenable<void> =>
        vscode.commands.executeCommand("_bookmarks.addBookmark", undefined, group.kind)),
    vscode.commands.registerCommand(
      "bookmarks.addBookmark.workspace",
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        vscode.commands.executeCommand("_bookmarks.addBookmark", pathOrUri, 'workspace')),
    vscode.commands.registerCommand(
      "bookmarks.copy.path",
      (bookmark: Bookmark): Thenable<void> => vscode.env.clipboard.writeText(
        bookmark.uri.scheme === 'file' ? bookmark.uri.fsPath : bookmark.uri.toString())),
    vscode.commands.registerCommand(
      "bookmarks.removeBookmark.global",
      (pathOrUri: string | vscode.Uri): Promise<boolean> =>
        bookmarkManager.removeBookmarkAsync(pathOrUri, 'global')),
    vscode.commands.registerCommand(
      "bookmarks.removeBookmark.tree",
      (bookmark: Bookmark): Promise<boolean> => bookmarkManager.removeBookmarkAsync(bookmark)),
    vscode.commands.registerCommand(
      "bookmarks.removeBookmark.workspace",
      (pathOrUri: string | vscode.Uri): Promise<boolean> =>
        bookmarkManager.removeBookmarkAsync(pathOrUri, 'workspace')));
}