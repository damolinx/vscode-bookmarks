import { TreeView, Uri, window } from 'vscode';
import { Bookmark, BookmarkKind } from '../bookmark';
import { BookmarkContainer } from '../bookmarkContainer';
import { BookmarkManager } from '../bookmarkManager';
import { BookmarkTreeItem } from '../bookmarkTreeProvider';

/**
 * Add a bookmark. If `pathOrUri` is missing, {@link window.activeTextEditor}
 * and current location are used as target.
 */
export async function addBookmarkAsync(
  manager: BookmarkManager,
  treeView: TreeView<BookmarkTreeItem | undefined>,
  pathOrUri: string | Uri | undefined,
  parentOrKind: BookmarkContainer | BookmarkKind,
  asSelection?: true,
): Promise<void> {
  let targetUri: Uri | undefined;
  if (pathOrUri instanceof Uri) {
    targetUri = pathOrUri;
  } else if (pathOrUri) {
    targetUri = Uri.parse(pathOrUri, true);
  } else if (window.activeNotebookEditor) {
    // Intentionally using activeTextEditor here. Notebook.uri would be the file
    // information only, missing the target cell location.
    targetUri = window.activeTextEditor?.document.uri;
  } else if (window.activeTextEditor) {
    const { selection } = window.activeTextEditor;
    let fragment = `L${selection.start.line + 1}`;
    if (!asSelection && selection.start.line !== selection.end.line) {
      fragment += `-L${selection.end.line + 1}`;
    }
    targetUri = window.activeTextEditor.document.uri.with({
      fragment,
    });
  }

  if (targetUri) {
    const addedItems = await manager.addAsync(parentOrKind, {
      uri: targetUri,
    });

    let bookmark: Bookmark | BookmarkContainer | undefined;
    if (addedItems.length) {
      bookmark = addedItems[0];
    } else if (parentOrKind instanceof BookmarkContainer) {
      bookmark = parentOrKind.getItem(targetUri);
    }

    if (bookmark) {
      if (parentOrKind instanceof BookmarkContainer) {
        await treeView.reveal(parentOrKind, { expand: true });
      }
      // DO NOT await, for some reason it ends on error sometimes.
      treeView.reveal(bookmark);
    }
  }
}
