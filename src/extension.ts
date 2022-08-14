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
      async (kind: BookmarkKind, pathOrUri?: string | vscode.Uri): Promise<void> => {
        if (!pathOrUri) {
          const editor = vscode.window.activeTextEditor;
          if (editor) {
            pathOrUri = editor.document.uri
              .with({ fragment: `L${editor.selection.start.line + 1}` });
          }
        }

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
        vscode.commands.executeCommand("_bookmarks.addBookmark", 'global', pathOrUri)),
    vscode.commands.registerCommand(
      "bookmarks.addBookmark.tree",
      (group: BookmarkGroup): Thenable<void> =>
        vscode.commands.executeCommand("_bookmarks.addBookmark", group.kind)),
    vscode.commands.registerCommand(
      "bookmarks.addBookmark.workspace",
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        vscode.commands.executeCommand("_bookmarks.addBookmark", 'workspace', pathOrUri)),
    vscode.commands.registerCommand(
      "bookmarks.copy.path",
      (bookmark: Bookmark): Thenable<void> => vscode.env.clipboard.writeText(
        bookmark.uri.scheme === 'file' ? bookmark.uri.fsPath : bookmark.uri.toString())),
    vscode.commands.registerCommand(
      "bookmarks.navigate.editor.next",
      async (pathOrUri?: string | vscode.Uri): Promise<void> => {
        const result = await getMatchingBookmarksAsync(pathOrUri, bookmarkManager,
          (editor, bookmark) => !!bookmark.lineNumber && (bookmark.lineNumber - 1) > editor.selection.start.line);
        if (result?.bookmarks.length) {
          const bookmark = result.bookmarks.sort(b => b.lineNumber!).at(0);
          bookmark!.selectLine(result.editor);
        }
      }),
    vscode.commands.registerCommand(
      "bookmarks.navigate.editor.previous",
      async (pathOrUri?: string | vscode.Uri): Promise<void> => {
        const result = await getMatchingBookmarksAsync(pathOrUri, bookmarkManager,
          (editor, bookmark) => !bookmark.lineNumber || (bookmark.lineNumber - 1) < editor.selection.start.line);
        if (result?.bookmarks.length) {
          const bookmark = result.bookmarks.sort(b => b.lineNumber!).at(-1);
          bookmark!.selectLine(result.editor);
        }
      }),
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

async function getMatchingBookmarksAsync(
  pathOrUri: string | vscode.Uri | undefined,
  manager: BookmarkManager,
  predicate: (editor: vscode.TextEditor, bookmark: Bookmark) => boolean):
  Promise<{ editor: vscode.TextEditor, bookmarks: Bookmark[] } | undefined> {
  let uri: vscode.Uri | undefined;
  let editor: vscode.TextEditor | undefined;

  if (pathOrUri) {
    uri = pathOrUri instanceof vscode.Uri ? pathOrUri : vscode.Uri.parse(pathOrUri);
  } else {
    editor = vscode.window.activeTextEditor;
    uri = editor?.document.uri;
  }
  if (!uri) {
    return; // No document to look at.
  }

  const documentBookmarks = manager.getBookmarks()
    .filter(b => b.uri.path === uri?.path);
  if (documentBookmarks.length === 0) {
    return; // No bookmarks for matching document.
  }

  if (!editor) {
    editor = await vscode.window.showTextDocument(uri);
  }

  const filteredBookmarks = documentBookmarks.filter(b => predicate(editor!, b));
  if (filteredBookmarks.length === 0) {
    return; // No bookmarks for matching document.
  }
  return { editor, bookmarks: filteredBookmarks };
}