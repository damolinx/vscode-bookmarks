import * as vscode from 'vscode';
import { Bookmark } from './bookmark';
import { BookmarkContainer } from './bookmarkContainer';
import { BookmarkDecoratorController } from './bookmarkDecoratorController';
import { BookmarkManager } from './bookmarkManager';
import { BookmarkTreeDragAndDropController } from './bookmarkTreeDragAndDropController';
import { BookmarkTreeProvider } from './bookmarkTreeProvider';
import { addBookmarkAsync } from './commands/addBookmark';
import { addBookmarkFolderAsync } from './commands/addBookmarkFolder';
import { exportBookmarks } from './commands/exportBookmarks';
import { importBookmarks } from './commands/importBookmarks';
import { openFolderBookmarks } from './commands/openFolderBookmarks';
import { removeBookmarkOrFolderAsync } from './commands/removeBookmarkOrFolder';
import { resetRootContainersAsync } from './commands/resetRootContainer';
import { search } from './commands/search';
import { updateDisplayNameAsync } from './commands/updateDisplayName';
import { updateLineNumberAsync } from './commands/updateLineNumber';
import { updateNotesAsync } from './commands/updateNotes';
import { EDITOR_SUPPORTED_CONTEXT_KEY, UNSUPPORTED_SCHEMES } from './constants';
import { renameBookmarkFolderAsync } from './commands/renameBookmarkFolder';

/**
 * Extension startup.
 * @param context Context.
 */
export async function activate(context: vscode.ExtensionContext) {
  const manager = new BookmarkManager(context);
  const decoratorController = new BookmarkDecoratorController(context, manager);
  const treeProvider = new BookmarkTreeProvider(context, manager);
  const treeView = vscode.window.createTreeView('bookmarks', {
    dragAndDropController: new BookmarkTreeDragAndDropController(manager),
    treeDataProvider: treeProvider,
  });

  context.subscriptions.push(decoratorController, manager, treeProvider, treeView);

  // Register event handlers
  context.subscriptions.push(
    // Refresh tree so node names reflect current workspace.
    vscode.workspace.onDidChangeWorkspaceFolders(() => treeProvider.refresh()),
    // Reveal a node when added.
    manager.onDidAddBookmark(
      async (bookmarks) => bookmarks?.length && (await treeView.reveal(bookmarks[0])),
    ),
  );

  // Register Commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'bookmarks.addBookmark.global',
      (pathOrUri: string | vscode.Uri | undefined): Thenable<void> =>
        addBookmarkAsync(manager, treeView, pathOrUri, 'global'),
    ),
    vscode.commands.registerCommand(
      'bookmarks.addBookmark.tree',
      (container: BookmarkContainer): Thenable<void> =>
        addBookmarkAsync(manager, treeView, undefined, container),
    ),
    vscode.commands.registerCommand(
      'bookmarks.addBookmark.workspace',
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        addBookmarkAsync(manager, treeView, pathOrUri, 'workspace'),
    ),
    vscode.commands.registerCommand(
      'bookmarks.addBookmarkFolder.tree',
      (container: BookmarkContainer): Thenable<void> =>
        addBookmarkFolderAsync(manager, treeView, container),
    ),
    vscode.commands.registerCommand(
      'bookmarks.addBookmarkFolder.allOpen.global',
      (): Thenable<void> => addBookmarkFolderAsync(manager, treeView, 'global', true),
    ),
    vscode.commands.registerCommand(
      'bookmarks.addBookmarkFolder.allOpen.tree',
      (container: BookmarkContainer): Thenable<void> =>
        addBookmarkFolderAsync(manager, treeView, container, true),
    ),
    vscode.commands.registerCommand(
      'bookmarks.addBookmarkFolder.allOpen.workspace',
      (): Thenable<void> => addBookmarkFolderAsync(manager, treeView, 'workspace', true),
    ),
    vscode.commands.registerCommand(
      'bookmarks.copy.path.tree',
      (bookmark: Bookmark): Thenable<void> =>
        vscode.env.clipboard.writeText(
          bookmark.uri.scheme === 'file' ? bookmark.uri.fsPath : bookmark.uri.path,
        ),
    ),
    vscode.commands.registerCommand(
      'bookmarks.editBookmark.displayName.remove.tree',
      (bookmark: Bookmark): Thenable<void> =>
        updateDisplayNameAsync(manager, treeView, bookmark, ''),
    ),
    vscode.commands.registerCommand(
      'bookmarks.editBookmark.displayName.update.tree',
      (bookmark: Bookmark): Thenable<void> =>
        updateDisplayNameAsync(manager, treeView, bookmark),
    ),
    vscode.commands.registerCommand(
      'bookmarks.editBookmark.lineNumber.update.tree',
      (bookmark: Bookmark): Thenable<void> =>
        updateLineNumberAsync(manager, treeView, bookmark),
    ),
    vscode.commands.registerCommand(
      'bookmarks.editBookmark.notes.remove.tree',
      (bookmark: Bookmark): Thenable<void> =>
        updateNotesAsync(manager, treeView, bookmark, ''),
    ),
    vscode.commands.registerCommand(
      'bookmarks.editBookmark.notes.update.tree',
      (bookmark: Bookmark): Thenable<void> => updateNotesAsync(manager, treeView, bookmark),
    ),
    vscode.commands.registerCommand(
      'bookmarks.export.tree',
      (container: BookmarkContainer): Thenable<void> =>
        exportBookmarks(manager, container.kind),
    ),
    vscode.commands.registerCommand(
      'bookmarks.import.tree',
      async (container: BookmarkContainer): Promise<void> => {
        const importContainer = await importBookmarks(manager, container.kind);
        if (importContainer) {
          await treeView.reveal(importContainer.container, { expand: true });
          await treeView.reveal(importContainer, { select: true });
        }
      },
    ),
    vscode.commands.registerCommand(
      'bookmarks.navigate.next.editor',
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        navigateAsync(manager, true, pathOrUri),
    ),
    vscode.commands.registerCommand(
      'bookmarks.navigate.previous.editor',
      (pathOrUri?: string | vscode.Uri): Thenable<void> =>
        navigateAsync(manager, false, pathOrUri),
    ),
    vscode.commands.registerCommand(
      'bookmarks.openFolder.tree',
      (container: BookmarkContainer): Thenable<void> => openFolderBookmarks(container),
    ),
    vscode.commands.registerCommand(
      'bookmarks.refreshBookmarks',
      (container?: BookmarkContainer): void => treeProvider.refresh(container),
    ),
    vscode.commands.registerCommand(
      'bookmarks.remove.tree',
      (bookmarkOrContainer?: Bookmark | BookmarkContainer): Thenable<boolean> =>
        removeBookmarkOrFolderAsync(manager, treeView, bookmarkOrContainer)
    ),
    vscode.commands.registerCommand(
      'bookmarks.removeBookmark.global',
      (pathOrUri: string | vscode.Uri): Thenable<boolean> =>
        manager.removeBookmarkAsync(pathOrUri, 'global'),
    ),
    vscode.commands.registerCommand(
      'bookmarks.removeBookmark.workspace',
      (pathOrUri: string | vscode.Uri): Thenable<boolean> =>
        manager.removeBookmarkAsync(pathOrUri, 'workspace'),
    ),
    vscode.commands.registerCommand(
      'bookmarks.removeBookmarks.global',
      (): Thenable<void> => resetRootContainersAsync(manager, 'global'),
    ),
    vscode.commands.registerCommand(
      'bookmarks.removeBookmarks.tree',
      (container: BookmarkContainer): Thenable<void> =>
        resetRootContainersAsync(manager, container.kind),
    ),
    vscode.commands.registerCommand(
      'bookmarks.removeBookmarks.workspace',
      (): Thenable<void> => resetRootContainersAsync(manager, 'workspace'),
    ),
    vscode.commands.registerCommand(
      'bookmarks.rename.tree',
      async (bookmarkOrContainer?: Bookmark | BookmarkContainer): Promise<void> => {
        // Keybinding carries no target.
        const target = bookmarkOrContainer ?? treeView.selection[0];
        if (target instanceof Bookmark) {
          await updateDisplayNameAsync(manager, treeView, target);
        } else if (target instanceof BookmarkContainer) {
          await renameBookmarkFolderAsync(manager, treeView, target);
        }
      }
    ),
    vscode.commands.registerCommand(
      'bookmarks.search',
      (): Thenable<void> => search(treeProvider, treeView),
    ),
    vscode.commands.registerCommand(
      'bookmarks.decorators.hide',
      (): Thenable<boolean> => decoratorController.toogleVisibilityAsync(),
    ),
    vscode.commands.registerCommand(
      'bookmarks.decorators.show',
      (): Thenable<boolean> => decoratorController.toogleVisibilityAsync(),
    ),
    vscode.commands.registerCommand(
      'bookmarks.decorators.toggle',
      (): Thenable<boolean> => decoratorController.toogleVisibilityAsync(),
    ),
    vscode.commands.registerCommand(
      'bookmarks.views.name',
      (): Thenable<void> => treeProvider.setViewKind('name'),
    ),
    vscode.commands.registerCommand(
      'bookmarks.views.path',
      (): Thenable<void> => treeProvider.setViewKind('path'),
    ),
  );

  // Track current editor
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      updateStateForEditor(editor);
    }),
  );
  updateStateForEditor(vscode.window.activeTextEditor);

  // Track Renames
  context.subscriptions.push(
    vscode.workspace.onDidRenameFiles((renames) =>
      manager.renameBookmarks(...renames.files),
    ),
  );

  // Upgrade datastore, best effort
  await manager
    .upgradeDatastores()
    .catch((error) => console.error(`Bookmarks: Failed to upgrade datastores.`, error));

  if (vscode.workspace.getConfiguration().get('bookmarks.marker.showByDefault', false)) {
    vscode.commands.executeCommand('bookmarks.decorators.toggle');
  }

  function updateStateForEditor(editor: vscode.TextEditor | undefined) {
    const editorSupported =
      !!editor && !UNSUPPORTED_SCHEMES.includes(editor.document.uri.scheme);
    vscode.commands.executeCommand(
      'setContext',
      EDITOR_SUPPORTED_CONTEXT_KEY,
      editorSupported,
    );
  }
}

async function getMatchingBookmarksAsync(
  pathOrUri: string | vscode.Uri | undefined,
  manager: BookmarkManager,
  filterPredicate: (editor: vscode.TextEditor, bookmark: Bookmark) => boolean,
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

  const documentBookmarks = manager.getBookmarks().filter((b) => b.uri.path === uri?.path) as Bookmark[];
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
  pathOrUri?: string | vscode.Uri,
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
    bookmark: Bookmark,
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
