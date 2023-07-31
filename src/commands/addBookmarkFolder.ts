import { TreeView, window } from 'vscode';
import { BookmarkContainer } from '../bookmarkContainer';
import { BookmarkManager } from '../bookmarkManager';
import { BookmarkTreeData } from '../bookmarkTreeProvider';

/**
 * Add a bookmark folder.
 */
export async function addBookmarkFolderAsync(
  manager: BookmarkManager,
  treeView: TreeView<BookmarkTreeData | undefined>,
  parent: BookmarkContainer
): Promise<void> {
  const folderName = await window.showInputBox({
    prompt: 'Provide a folder name',
    placeHolder: 'Enter a folder name…',
    validateInput: (value) =>
      value.trim().length === 0 ? 'Name cannot be empty' : undefined,
  });
  if (folderName) {
    const targetUri = BookmarkContainer.createUriForName(folderName, parent);
    const addedItems = await manager.addAsync(parent, {
      uri: targetUri,
    });

    let folder: any | undefined;
    if (addedItems.length) {
      folder = addedItems[0];
    } else {
      folder = parent.getItem(targetUri);
    }

    if (folder) {
      // DO NOT await, for some reason it ends on error sometimes.
      treeView.reveal(folder, { expand: true, select: true });
    }
  }
}
