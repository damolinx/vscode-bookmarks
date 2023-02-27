import * as vscode from 'vscode';
import { Bookmark, BookmarkKind, DEFAULT_LINE_NUMBER } from './bookmark';
import { BookmarkDatastore } from './bookmarkDatastore';
import { BookmarkDecoratorController } from './bookmarkDecoratorController';
import { BookmarkGroup } from './bookmarkGroup';
import { BookmarkManager } from './bookmarkManager';
import { BookmarkTreeDragAndDropController } from './bookmarkTreeDragAndDropController';
import { BookmarkTreeProvider } from './bookmarkTreeProvider';

/**
 * Extension startup.
 * @param context Context.
 */
export async function activate(context: vscode.ExtensionContext) {

  const manager = new BookmarkManager(context);
  const decoratorController = new BookmarkDecoratorController(context, manager);
  const treeProvider = new BookmarkTreeProvider(manager);
  const treeView = vscode.window.createTreeView('bookmarks', {
    dragAndDropController: new BookmarkTreeDragAndDropController(manager),
    treeDataProvider: treeProvider,
  });

  await new BookmarkDatastore(context.globalState).upgradeAsync();

  context.subscriptions.push(
    decoratorController,
    manager,
    treeProvider,
    treeView,
    // Ensures node names reflect current workspace by refreshing tree.
    vscode.workspace.onDidChangeWorkspaceFolders(() =>
      treeProvider.refresh()),
    // Reveal a node when added.
    manager.onDidAddBookmark(async (bookmarks) =>
      bookmarks && await treeView.reveal(bookmarks[0])));

  // Register Commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "bookmarks.addBookmark.global",
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        addBookmarkAsync(manager, treeView, "global", pathOrUri)),
    vscode.commands.registerCommand(
      "bookmarks.addBookmark.tree",
      (group: BookmarkGroup): Thenable<void> =>
        addBookmarkAsync(manager, treeView, group.kind)),
    vscode.commands.registerCommand(
      "bookmarks.addBookmark.workspace",
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        addBookmarkAsync(manager, treeView, "workspace", pathOrUri)),
    vscode.commands.registerCommand(
      "bookmarks.copy.path",
      (bookmark: Bookmark): Thenable<void> =>
        vscode.env.clipboard.writeText(
          bookmark.uri.scheme === "file" ? bookmark.uri.fsPath : bookmark.uri.path)),
    vscode.commands.registerCommand(
      "bookmarks.editBookmark.displayName.remove.tree",
      async (bookmark: Bookmark): Promise<void> => {
        await manager.renameBookmarkAsync(bookmark, undefined);
        await treeView.reveal(bookmark, {focus: true});
      }),
    vscode.commands.registerCommand(
      "bookmarks.editBookmark.displayName.update.tree",
      (bookmark: Bookmark): Thenable<void> =>
        updateDisplayNameAsync(bookmark, manager, treeView)),
    vscode.commands.registerCommand(
      "bookmarks.editBookmark.lineNumber.update.tree",
      (bookmark: Bookmark): Thenable<void> =>
        updateLineNumberAsync(bookmark, manager, treeView)),
    vscode.commands.registerCommand(
      "bookmarks.navigate.next.editor",
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        navigateAsync(manager, true, pathOrUri)),
    vscode.commands.registerCommand(
      "bookmarks.navigate.previous.editor",
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        navigateAsync(manager, false, pathOrUri)),
    vscode.commands.registerCommand(
      "bookmarks.removeBookmark.global",
      (pathOrUri: string | vscode.Uri): Promise<boolean> =>
        manager.removeBookmarkAsync(pathOrUri, "global")),
    vscode.commands.registerCommand(
      "bookmarks.removeBookmark.tree",
      (bookmark: Bookmark): Promise<boolean> =>
        manager.removeBookmarkAsync(bookmark)),
    vscode.commands.registerCommand(
      "bookmarks.removeBookmark.workspace",
      (pathOrUri: string | vscode.Uri): Promise<boolean> =>
        manager.removeBookmarkAsync(pathOrUri, "workspace")),
    vscode.commands.registerCommand(
      "bookmarks.removeBookmarks.global",
      async (): Promise<vscode.Uri[]> =>
        (await manager.removeAllBookmarksAsync("global"))
          .map(b => b.uri)),
    vscode.commands.registerCommand(
      "bookmarks.removeBookmarks.tree",
      async (bookmarkGroup: BookmarkGroup): Promise<vscode.Uri[]> =>
        (await manager.removeAllBookmarksAsync(bookmarkGroup.kind))
          .map(b => b.uri)),
    vscode.commands.registerCommand(
      "bookmarks.removeBookmarks.workspace",
      async (): Promise<vscode.Uri[]> =>
        (await manager.removeAllBookmarksAsync("workspace"))
          .map(b => b.uri)),
    vscode.commands.registerCommand(
      "bookmarks.decorators.hide",
      (): Promise<boolean> =>
        decoratorController.toogleVisibilityAsync()),
    vscode.commands.registerCommand(
      "bookmarks.decorators.show",
      (): Promise<boolean> =>
        decoratorController.toogleVisibilityAsync()),
    vscode.commands.registerCommand(
      "bookmarks.decorators.toggle",
      (): Promise<boolean> =>
        decoratorController.toogleVisibilityAsync()),
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
    const bookmark = await bookmarkManager.addBookmarkAsync(kind, pathOrUri);
    if (!bookmark) {
      bookmarkTreeView.reveal(bookmarkManager.getBookmark(kind, pathOrUri));
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

// TODO: Move
async function updateDisplayNameAsync(
  bookmark: Bookmark,
  bookmarkManager: BookmarkManager,
  treeView: vscode.TreeView<Bookmark | BookmarkGroup | undefined>): Promise<void> {
  const name = await vscode.window.showInputBox({
    prompt: "Update bookmark display name",
    placeHolder: "Provide a custom display name",
    value: bookmark.hasDisplayName ? bookmark.displayName : '',
    validateInput: (value) => !value.trim().length ? "Display name cannot be empty" : undefined
  });
  if (name !== undefined) {
    await bookmarkManager.renameBookmarkAsync(bookmark, name.trim());
    await treeView.reveal(bookmark, {focus: true});
  }
}

// TODO: Move
async function updateLineNumberAsync(
  bookmark: Bookmark,
  bookmarkManager: BookmarkManager,
  treeView: vscode.TreeView<Bookmark | BookmarkGroup | undefined>): Promise<void> {
  const existingLineNumbers = bookmarkManager
    .getBookmarks({ ignoreLineNumber: true, kind: bookmark.kind, uri: bookmark.uri })
    .map((b) => b.lineNumber)
    .filter((l) => l !== bookmark.lineNumber);
  const lineNumber = await vscode.window.showInputBox({
    prompt: "Update bookmark line number",
    placeHolder: "Provide a line number",
    value: (bookmark.hasLineNumer ? bookmark.lineNumber : DEFAULT_LINE_NUMBER).toString(),
    validateInput: (value) => {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1) {
        return "Line number must be an integer value greater than or equal to 1";
      }
      if (existingLineNumbers.includes(n)) {
        return "Line number conflicts with an existing bookmark";
      }
      return undefined;
    }
  });
  if (lineNumber !== undefined) {
    const updatedBookmark = await bookmarkManager.updateLineNumberAsync(bookmark, Number(lineNumber));
    if (updatedBookmark) {
      await treeView.reveal(updatedBookmark, {focus: true});
    }
  }
}