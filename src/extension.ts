import * as vscode from 'vscode';
import { Bookmark, BookmarkKind } from './bookmark';
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

  context.subscriptions.push(decoratorController, manager, treeProvider, treeView);

  // Register even handlers
  context.subscriptions.push(
    // Refrest three so node names reflect current workspace.
    vscode.workspace.onDidChangeWorkspaceFolders(() => treeProvider.refresh()),
    // Reveal a node when added.
    manager.onDidAddBookmark(
      async (bookmarks) => bookmarks && (await treeView.reveal(bookmarks[0]))
    )
  );

  // Register Commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'bookmarks.addBookmark.global',
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        addBookmarkAsync(manager, treeView, 'global', pathOrUri)
    ),
    vscode.commands.registerCommand(
      'bookmarks.addBookmark.tree',
      (group: BookmarkGroup): Thenable<void> =>
        addBookmarkAsync(manager, treeView, group.kind)
    ),
    vscode.commands.registerCommand(
      'bookmarks.addBookmark.workspace',
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        addBookmarkAsync(manager, treeView, 'workspace', pathOrUri)
    ),
    vscode.commands.registerCommand(
      'bookmarks.copy.path',
      (bookmark: Bookmark): Thenable<void> =>
        vscode.env.clipboard.writeText(
          bookmark.uri.scheme === 'file' ? bookmark.uri.fsPath : bookmark.uri.path
        )
    ),
    vscode.commands.registerCommand(
      'bookmarks.editBookmark.displayName.remove.tree',
      (bookmark?: Bookmark): Thenable<void> =>
        updateDisplayNameAsync(manager, treeView, bookmark, '')
    ),
    vscode.commands.registerCommand(
      'bookmarks.editBookmark.displayName.update.tree',
      (bookmark?: Bookmark): Thenable<void> =>
        updateDisplayNameAsync(manager, treeView, bookmark)
    ),
    vscode.commands.registerCommand(
      'bookmarks.editBookmark.lineNumber.update.tree',
      (bookmark: Bookmark): Thenable<void> =>
        updateLineNumberAsync(manager, treeView, bookmark)
    ),
    vscode.commands.registerCommand(
      'bookmarks.navigate.next.editor',
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        navigateAsync(manager, true, pathOrUri)
    ),
    vscode.commands.registerCommand(
      'bookmarks.navigate.previous.editor',
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        navigateAsync(manager, false, pathOrUri)
    ),
    vscode.commands.registerCommand(
      'bookmarks.refreshBookmarks',
      (bookmarkGroup?: BookmarkGroup): void => treeProvider.refresh(bookmarkGroup)
    ),
    vscode.commands.registerCommand(
      'bookmarks.removeBookmark.global',
      (pathOrUri: string | vscode.Uri): Thenable<boolean> =>
        manager.removeBookmarkAsync(pathOrUri, 'global')
    ),
    vscode.commands.registerCommand(
      'bookmarks.removeBookmark.tree',
      (bookmark?: Bookmark): Thenable<boolean> =>
        removeBookmarksAsync(manager, treeView, bookmark)
    ),
    vscode.commands.registerCommand(
      'bookmarks.removeBookmark.workspace',
      (pathOrUri: string | vscode.Uri): Thenable<boolean> =>
        manager.removeBookmarkAsync(pathOrUri, 'workspace')
    ),
    vscode.commands.registerCommand(
      'bookmarks.removeBookmarks.global',
      (): Thenable<void> => removeAllBookmarksAsync(manager, 'global')
    ),
    vscode.commands.registerCommand(
      'bookmarks.removeBookmarks.tree',
      (bookmarkGroup: BookmarkGroup): Thenable<void> =>
        removeAllBookmarksAsync(manager, bookmarkGroup.kind)
    ),
    vscode.commands.registerCommand(
      'bookmarks.removeBookmarks.workspace',
      (): Thenable<void> => removeAllBookmarksAsync(manager, 'workspace')
    ),
    vscode.commands.registerCommand(
      'bookmarks.decorators.hide',
      (): Thenable<boolean> => decoratorController.toogleVisibilityAsync()
    ),
    vscode.commands.registerCommand(
      'bookmarks.decorators.show',
      (): Thenable<boolean> => decoratorController.toogleVisibilityAsync()
    ),
    vscode.commands.registerCommand(
      'bookmarks.decorators.toggle',
      (): Thenable<boolean> => decoratorController.toogleVisibilityAsync()
    )
  );

  // Upgrade, best effort
  await manager
    .upgradeDatastores()
    .catch((error) => console.error(`Bookmarks: Failed to upgrade datastores.`, error));
}

async function addBookmarkAsync(
  manager: BookmarkManager,
  treeView: vscode.TreeView<Bookmark | BookmarkGroup | undefined>,
  kind: BookmarkKind,
  pathOrUri?: string | vscode.Uri
): Promise<void> {
  if (!pathOrUri) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      pathOrUri = editor.document.uri.with({
        fragment: `L${editor.selection.start.line + 1}`,
      });
    }
  }

  if (pathOrUri) {
    const bookmarks = await manager.addBookmarksAsync(kind, { uri: pathOrUri });
    if (bookmarks.length === 0) {
      treeView.reveal(manager.getBookmark(kind, pathOrUri));
    }
  }
}

async function getMatchingBookmarksAsync(
  pathOrUri: string | vscode.Uri | undefined,
  manager: BookmarkManager,
  filterPredicate: (editor: vscode.TextEditor, bookmark: Bookmark) => boolean
): Promise<{ editor: vscode.TextEditor; bookmarks: Bookmark[] } | undefined> {
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

  const documentBookmarks = manager.getBookmarks().filter((b) => b.uri.path === uri?.path);
  if (documentBookmarks.length === 0) {
    return; // No bookmarks matching document.
  }

  // Delayed creating editor as much as possible.
  if (!editor) {
    editor = await vscode.window.showTextDocument(uri);
  }

  const filteredBookmarks = documentBookmarks.filter((b) => filterPredicate(editor!, b));
  if (filteredBookmarks.length === 0) {
    return; // No bookmarks matching filter.
  }
  return { editor, bookmarks: filteredBookmarks };
}

async function navigateAsync(
  manager: BookmarkManager,
  next: boolean,
  pathOrUri?: string | vscode.Uri
): Promise<void> {
  const result = await getMatchingBookmarksAsync(pathOrUri, manager, getFilterPredicate());
  if (result) {
    const bookmark = result.bookmarks.sort(getSortPredicate()).at(0);
    if (bookmark) {
      selectBookmark(result.editor, bookmark);
    }
  }

  function getFilterPredicate(): (
    editor: vscode.TextEditor,
    bookmark: Bookmark
  ) => boolean {
    return next
      ? (editor, bookmark) => bookmark.lineNumber - 1 > editor.selection.start.line
      : (editor, bookmark) => bookmark.lineNumber - 1 < editor.selection.start.line;
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

async function removeAllBookmarksAsync(
  manager: BookmarkManager,
  kind?: BookmarkKind
): Promise<void> {
  if (!manager.hasBookmarks(kind)) {
    return; // Nothing to do
  }

  if (
    (await vscode.window.showInformationMessage(
      `Are you sure you want to delete all ${kind ? `'${kind}' ` : ``}bookmarks?`,
      {
        modal: true,
        detail: 'This action only affects the selected group but it is irreversible.',
      },
      'Yes',
      'No'
    )) === 'Yes'
  ) {
    await manager.removeAllBookmarksAsync(kind);
  }
}

async function removeBookmarksAsync(
  manager: BookmarkManager,
  treeView: vscode.TreeView<Bookmark | BookmarkGroup | undefined>,
  bookmark?: Bookmark
): Promise<boolean> {
  const bookmarksToRemove: Bookmark[] = [];
  if (bookmark) {
    bookmarksToRemove.push(bookmark);
  } else {
    treeView.selection.forEach((element) => {
      if (element instanceof Bookmark) {
        bookmarksToRemove.push(element);
      }
    });
  }

  const removed = await manager.removeBookmarksAsync(...bookmarksToRemove);
  return !!removed.length;
}

// TODO: Move
async function updateDisplayNameAsync(
  manager: BookmarkManager,
  treeView: vscode.TreeView<Bookmark | BookmarkGroup | undefined>,
  bookmark?: Bookmark,
  name?: string
): Promise<void> {
  const targetBookmark =
    bookmark ||
    <Bookmark | undefined>treeView.selection.filter((b) => b instanceof Bookmark)[0];
  if (!targetBookmark) {
    return;
  }

  const targetName =
    name !== undefined
      ? name
      : await vscode.window.showInputBox({
          prompt: 'Provide a new bookmark display name',
          placeHolder: 'Enter a display name…',
          value: targetBookmark.hasDisplayName ? targetBookmark.displayName : '',
          validateInput: (value) =>
            value.trim().length === 0 ? 'Name cannot be empty' : undefined,
        });
  if (targetName !== undefined) {
    const updatedBookmark = await manager.updateBookmarkAsync(targetBookmark, {
      displayName: targetName.trim(),
    });
    await treeView.reveal(updatedBookmark, { focus: true });
  }
}

// TODO: Move
async function updateLineNumberAsync(
  manager: BookmarkManager,
  treeView: vscode.TreeView<Bookmark | BookmarkGroup | undefined>,
  bookmark: Bookmark
): Promise<void> {
  const existingLineNumbers = manager
    .getBookmarks({
      ignoreLineNumber: true,
      kind: bookmark.kind,
      uri: bookmark.uri,
    })
    .map((b) => b.lineNumber)
    .filter((l) => l !== bookmark.lineNumber);
  const lineNumber = await vscode.window.showInputBox({
    prompt: 'Update bookmark line number',
    placeHolder: 'Provide a line number',
    value: bookmark.lineNumber.toString(),
    validateInput: (value) => {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1) {
        return 'Line number must be an integer value greater than or equal to 1';
      }
      if (existingLineNumbers.includes(n)) {
        return 'Line number conflicts with an existing bookmark';
      }
      return undefined;
    },
  });
  if (lineNumber !== undefined) {
    const updatedBookmark = await manager.updateBookmarkAsync(bookmark, {
      lineNumber: Number(lineNumber),
    });
    await treeView.reveal(updatedBookmark, { focus: true });
  }
}
