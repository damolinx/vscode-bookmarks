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
import { openBookmark } from './commands/openBookmark';
import { openFolderBookmarks } from './commands/openFolderBookmarks';
import { removeBookmarkOrFolderAsync } from './commands/removeBookmarkOrFolder';
import { renameBookmarkFolderAsync } from './commands/renameBookmarkFolder';
import { resetRootContainersAsync } from './commands/resetRootContainer';
import { search } from './commands/search';
import { updateDisplayNameAsync } from './commands/updateDisplayName';
import { updateLineNumberAsync } from './commands/updateLineNumber';
import { updateNotesAsync } from './commands/updateNotes';
import { EDITOR_SUPPORTED_CONTEXT_KEY, UNSUPPORTED_SCHEMES } from './constants';

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
    showCollapseAll: true,
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

  const {
    commands: { registerCommand: cr },
  } = vscode;

  // Register Commands
  context.subscriptions.push(
    cr('bookmarks.addBookmark.global', (pathOrUri: string | vscode.Uri | undefined) =>
      addBookmarkAsync(manager, treeView, pathOrUri, 'global'),
    ),
    cr('bookmarks.addBookmark.tree', (container: BookmarkContainer) =>
      addBookmarkAsync(manager, treeView, undefined, container),
    ),
    cr('bookmarks.addBookmark.workspace', (pathOrUri?: string | vscode.Uri) =>
      addBookmarkAsync(manager, treeView, pathOrUri, 'workspace'),
    ),
    cr('bookmarks.addBookmarkFolder.tree', (container: BookmarkContainer) =>
      addBookmarkFolderAsync(manager, treeView, container),
    ),
    cr('bookmarks.addBookmarkFolder.allOpen.global', () =>
      addBookmarkFolderAsync(manager, treeView, 'global', true),
    ),
    cr('bookmarks.addBookmarkFolder.allOpen.tree', (container: BookmarkContainer) =>
      addBookmarkFolderAsync(manager, treeView, container, true),
    ),
    cr('bookmarks.addBookmarkFolder.allOpen.workspace', () =>
      addBookmarkFolderAsync(manager, treeView, 'workspace', true),
    ),
    cr('bookmarks.copy.path.tree', (bookmark: Bookmark) =>
      vscode.env.clipboard.writeText(
        bookmark.uri.scheme === 'file' ? bookmark.uri.fsPath : bookmark.uri.path,
      ),
    ),
    cr('bookmarks.editBookmark.displayName.remove.tree', (bookmark: Bookmark) =>
      updateDisplayNameAsync(manager, treeView, bookmark, ''),
    ),
    cr('bookmarks.editBookmark.displayName.update.tree', (bookmark: Bookmark) =>
      updateDisplayNameAsync(manager, treeView, bookmark),
    ),
    cr('bookmarks.editBookmark.lineNumber.update.tree', (bookmark: Bookmark) =>
      updateLineNumberAsync(manager, treeView, bookmark),
    ),
    cr('bookmarks.editBookmark.notes.remove.tree', (bookmark: Bookmark) =>
      updateNotesAsync(manager, treeView, bookmark, ''),
    ),
    cr('bookmarks.editBookmark.notes.update.tree', (bookmark: Bookmark) =>
      updateNotesAsync(manager, treeView, bookmark),
    ),
    cr('bookmarks.export.tree', (container: BookmarkContainer) =>
      exportBookmarks(manager, container.kind),
    ),
    cr('bookmarks.import.tree', async (container: BookmarkContainer): Promise<void> => {
      const importContainer = await importBookmarks(manager, container.kind);
      if (importContainer) {
        await treeView.reveal(importContainer.container, { expand: true });
        await treeView.reveal(importContainer, { select: true });
      }
    }),
    cr('bookmarks.navigate.next.editor', (pathOrUri?: string | vscode.Uri) =>
      navigateAsync(manager, true, pathOrUri),
    ),
    cr('bookmarks.navigate.previous.editor', (pathOrUri?: string | vscode.Uri) =>
      navigateAsync(manager, false, pathOrUri),
    ),
    cr('_bookmarks.open', (bookmark: Bookmark) => openBookmark(bookmark)),
    cr('bookmarks.openFolder.tree', (container: BookmarkContainer) =>
      openFolderBookmarks(container),
    ),
    cr('bookmarks.refreshBookmarks', (container?: BookmarkContainer): void =>
      treeProvider.refresh(container),
    ),
    cr('bookmarks.remove.tree', (bookmarkOrContainer?: Bookmark | BookmarkContainer) =>
      removeBookmarkOrFolderAsync(manager, treeView, bookmarkOrContainer),
    ),
    cr('bookmarks.removeBookmark.global', (pathOrUri: string | vscode.Uri) =>
      manager.removeBookmarkAsync(pathOrUri, 'global'),
    ),
    cr('bookmarks.removeBookmark.workspace', (pathOrUri: string | vscode.Uri) =>
      manager.removeBookmarkAsync(pathOrUri, 'workspace'),
    ),
    cr('bookmarks.removeBookmarks.global', () => resetRootContainersAsync(manager, 'global')),
    cr('bookmarks.removeBookmarks.tree', (container: BookmarkContainer) =>
      resetRootContainersAsync(manager, container.kind),
    ),
    cr('bookmarks.removeBookmarks.workspace', () => resetRootContainersAsync(manager, 'workspace')),
    cr(
      'bookmarks.rename.tree',
      async (bookmarkOrContainer?: Bookmark | BookmarkContainer): Promise<void> => {
        // Keybinding carries no target.
        const target = bookmarkOrContainer ?? treeView.selection[0];
        if (target instanceof Bookmark) {
          await updateDisplayNameAsync(manager, treeView, target);
        } else if (target instanceof BookmarkContainer) {
          await renameBookmarkFolderAsync(manager, treeView, target);
        }
      },
    ),
    cr('bookmarks.search', () => search(treeProvider, treeView)),
    cr('bookmarks.decorators.hide', () => decoratorController.toogleVisibilityAsync()),
    cr('bookmarks.decorators.show', () => decoratorController.toogleVisibilityAsync()),
    cr('bookmarks.decorators.toggle', () => decoratorController.toogleVisibilityAsync()),
    cr('bookmarks.views.name', () => treeProvider.setViewKind('name')),
    cr('bookmarks.views.path', () => treeProvider.setViewKind('path')),
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
    vscode.workspace.onDidRenameFiles((renames) => manager.renameBookmarks(...renames.files)),
  );

  // Upgrade datastore, best effort
  await manager
    .upgradeDatastores()
    .catch((error) => console.error('Bookmarks: Failed to upgrade datastores.', error));

  if (vscode.workspace.getConfiguration().get('bookmarks.marker.showByDefault', false)) {
    vscode.commands.executeCommand('bookmarks.decorators.toggle');
  }

  function updateStateForEditor(editor: vscode.TextEditor | undefined) {
    const editorSupported = !!editor && !UNSUPPORTED_SCHEMES.includes(editor.document.uri.scheme);
    vscode.commands.executeCommand('setContext', EDITOR_SUPPORTED_CONTEXT_KEY, editorSupported);
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

  const documentBookmarks = manager
    .getBookmarks()
    .filter((b) => b.uri.path === uri?.path) as Bookmark[];
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

  function getFilterPredicate(): (editor: vscode.TextEditor, bookmark: Bookmark) => boolean {
    return next
      ? (editor, bookmark) => bookmark.start - 1 > editor.selection.start.line
      : (editor, bookmark) => bookmark.start - 1 < editor.selection.start.line;
  }

  function getSortPredicate(): (a: Bookmark, b: Bookmark) => number {
    return next
      ? (a, b) => a.start - b.start || (a.end ?? 0) - (b.end ?? 0)
      : (a, b) => b.start - a.start || (b.end ?? 0) - (a.end ?? 0);
  }

  function selectBookmark(editor: vscode.TextEditor, bookmark: Bookmark) {
    const start = new vscode.Position(bookmark.start - 1, 0);
    const end = bookmark.end ? new vscode.Position(bookmark.end - 1, 0) : start;
    editor.selection = new vscode.Selection(start, end);
    editor.revealRange(editor.selection);
  }
}
