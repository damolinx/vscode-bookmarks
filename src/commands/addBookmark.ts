import { TreeView, Uri, window } from 'vscode';
import { BookmarkKind } from '../bookmark';
import { BookmarkContainer } from '../bookmarkContainer';
import { BookmarkManager } from '../bookmarkManager';
import { BookmarkTreeData } from '../bookmarkTreeProvider';

/**
 * Add a bookmark. If `pathOrUri` is missing, {@link window.activeTextEditor}
 * and current location are used as target.
 */
export async function addBookmarkAsync(
  manager: BookmarkManager,
  treeView: TreeView<BookmarkTreeData | undefined>,
  pathOrUri: string | Uri | undefined,
  parentOrKind: BookmarkContainer | BookmarkKind,
): Promise<void> {
  let targetUri: Uri | undefined;
  if (pathOrUri instanceof Uri) {
    targetUri = pathOrUri;
  } else if (pathOrUri) {
    targetUri = Uri.parse(pathOrUri, true);
  } else if (window.activeTextEditor) {
    const targetLine = window.activeTextEditor.selection.start.line;
    targetUri = window.activeTextEditor.document.uri.with({
      fragment: `L${targetLine + 1}`,
    });
  }

  if (targetUri) {
    const addedItems = await manager.addAsync(parentOrKind, {
      uri: targetUri,
    });

    let bookmark: any | undefined;
    if (addedItems.length) {
      bookmark = addedItems[0];
    } else if (parentOrKind instanceof BookmarkContainer) {
      bookmark = parentOrKind.getItem(targetUri);
    }

    if (bookmark) {
      // DO NOT await, for some reason it ends on error sometimes.
      treeView.reveal(bookmark, { expand: true });
    }
  }
}
