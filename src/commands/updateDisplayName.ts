import { TreeView, window } from 'vscode';
import { Bookmark } from '../bookmark';
import { BookmarkManager } from '../bookmarkManager';
import { BookmarkTreeItem } from '../bookmarkTreeProvider';

export async function updateDisplayNameAsync(
  manager: BookmarkManager,
  treeView: TreeView<BookmarkTreeItem | undefined>,
  bookmark?: Bookmark,
  name?: string,
): Promise<void> {
  let targetBookmark = bookmark;
  if (!targetBookmark && treeView.selection[0] instanceof Bookmark) {
    targetBookmark = treeView.selection[0];
  }
  if (!targetBookmark) {
    return;
  }

  const targetName =
    name !== undefined
      ? name
      : await window.showInputBox({
          prompt: 'Provide a new bookmark display name (leave empty to remove)',
          placeHolder: 'Enter a display name …',
          value: targetBookmark.hasDisplayName ? targetBookmark.displayName : '',
        });
  if (targetName !== undefined) {
    const updatedBookmark = await manager.updateBookmarkAsync(targetBookmark, {
      displayName: targetName.trim(),
    });
    await treeView.reveal(updatedBookmark, { focus: true });
  }
}
