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

  context.subscriptions.push(
    bookmarkManager,
    bookmarkTreeProvider,
    bookmarkTreeView,
    // Ensures node names reflect current workspace by refreshing tree.
    vscode.workspace.onDidChangeWorkspaceFolders(() =>
      bookmarkTreeProvider.refresh()),
    // Reveal a node when added.
    bookmarkManager.onDidAddBookmark(async (bookmarks) =>
      bookmarks && await bookmarkTreeView.reveal(bookmarks[0])));

  // Register Commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "bookmarks.addBookmark.global",
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        addBookmarkAsync(bookmarkManager, bookmarkTreeView, "global", pathOrUri)),
    vscode.commands.registerCommand(
      "bookmarks.addBookmark.tree",
      (group: BookmarkGroup): Thenable<void> =>
        addBookmarkAsync(bookmarkManager, bookmarkTreeView, group.kind)),
    vscode.commands.registerCommand(
      "bookmarks.addBookmark.workspace",
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        addBookmarkAsync(bookmarkManager, bookmarkTreeView, "workspace", pathOrUri)),
    vscode.commands.registerCommand(
      "bookmarks.copy.path",
      (bookmark: Bookmark): Thenable<void> =>
        vscode.env.clipboard.writeText(
          bookmark.uri.scheme === "file" ? bookmark.uri.fsPath : bookmark.uri.toString())),
    vscode.commands.registerCommand(
      "bookmarks.navigate.next.editor",
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        navigateAsync(bookmarkManager, true, pathOrUri)),
    vscode.commands.registerCommand(
      "bookmarks.navigate.previous.editor",
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        navigateAsync(bookmarkManager, false, pathOrUri)),
    vscode.commands.registerCommand(
      "bookmarks.removeBookmark.global",
      (pathOrUri: string | vscode.Uri): Promise<boolean> =>
        bookmarkManager.removeBookmarkAsync(pathOrUri, "global")),
    vscode.commands.registerCommand(
      "bookmarks.removeBookmark.tree",
      (bookmark: Bookmark): Promise<boolean> =>
        bookmarkManager.removeBookmarkAsync(bookmark)),
    vscode.commands.registerCommand(
      "bookmarks.removeBookmark.workspace",
      (pathOrUri: string | vscode.Uri): Promise<boolean> =>
        bookmarkManager.removeBookmarkAsync(pathOrUri, "workspace")),
    vscode.commands.registerCommand(
      "bookmarks.removeBookmarks.global",
      async (): Promise<vscode.Uri[]> =>
        (await bookmarkManager.removeAllBookmarksAsync("global"))
          .map(b => b.uri)),
    vscode.commands.registerCommand(
      "bookmarks.removeBookmarks.tree",
      async (bookmarkGroup: BookmarkGroup): Promise<vscode.Uri[]> =>
        (await bookmarkManager.removeAllBookmarksAsync(bookmarkGroup.kind))
          .map(b => b.uri)),
    vscode.commands.registerCommand(
      "bookmarks.removeBookmarks.workspace",
      async (): Promise<vscode.Uri[]> =>
        (await bookmarkManager.removeAllBookmarksAsync("workspace"))
          .map(b => b.uri)),
  );
}

async function addBookmarkAsync(
  bookmarkManager: BookmarkManager,
  bookmarkTreeView: vscode.TreeView<Bookmark | BookmarkGroup | undefined>,
  kind: BookmarkKind,
  pathOrUri?: string | vscode.Uri): Promise<void> {
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
}

async function getMatchingBookmarksAsync(
  pathOrUri: string | vscode.Uri | undefined,
  manager: BookmarkManager,
  filterPredicate: (editor: vscode.TextEditor, bookmark: Bookmark) => boolean):
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
    return; // No bookmarks matching document.
  }

  // Delayed creating editor as much as possible.
  if (!editor) {
    editor = await vscode.window.showTextDocument(uri);
  }

  const filteredBookmarks = documentBookmarks
    .filter(b => filterPredicate(editor!, b));
  if (filteredBookmarks.length === 0) {
    return; // No bookmarks matching filter.
  }
  return { editor, bookmarks: filteredBookmarks };
}

async function navigateAsync(
  bookmarkManager: BookmarkManager,
  next: boolean,
  pathOrUri?: string | vscode.Uri): Promise<void> {

  const result = await getMatchingBookmarksAsync(pathOrUri, bookmarkManager, getFilterPredicate());
  if (result) {
    const bookmark = result.bookmarks.sort(getSortPredicate()).at(0);
    if (bookmark) {
      selectBookmark(result.editor, bookmark);
    }
  }

  function getFilterPredicate(): (editor: vscode.TextEditor, bookmark: Bookmark) => boolean {
    return next
      ? (editor, bookmark) => (bookmark.lineNumber - 1) > editor.selection.start.line
      : (editor, bookmark) => (bookmark.lineNumber - 1) < editor.selection.start.line;
  }

  function getSortPredicate(): (a: Bookmark, b: Bookmark) => number {
    return next
      ? (a, b) => a.lineNumber - b.lineNumber
      : (a, b) => b.lineNumber - a.lineNumber;
  }

  function selectBookmark(editor: vscode.TextEditor, bookmark: Bookmark) {
    const position = new vscode.Position(bookmark.lineNumber - 1, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position));
  }
}