import { TreeView, window } from 'vscode';
import { BookmarkContainer } from '../bookmarkContainer';
import { BookmarkManager } from '../bookmarkManager';
import { BookmarkTreeItem } from '../bookmarkTreeProvider';

/**
 * Remove a bookmark folder.
 */
export async function renameBookmarkFolderAsync(
  manager: BookmarkManager,
  treeView: TreeView<BookmarkTreeItem | undefined>,
  folder: BookmarkContainer
): Promise<void> {
  const parent = folder.container!;
  const folderName = await window.showInputBox({
    prompt: `Provide a new name for '${folder.displayName}'`,
    placeHolder: 'Enter a folder name…',
    value: folder.displayName,
    validateInput: (value) => {
      const normalized = value.trim();
      if (normalized.length === 0) {
        return 'Name cannot be empty';
      } else if (normalized === folder.displayName) {
        return 'Name cannot be the current name';
      }
      else if (
        parent
          .getItems()
          .some((i) => i instanceof BookmarkContainer && i.displayName === normalized)
      ) {
        return 'Folder already exists';
      }
      return;
    },
  });
  if (folderName) {
    const newFolder = await manager.renameBookmarkFolder(folder, folderName);
    await treeView.reveal(newFolder, { select: true });
  }
}
