import { TreeView, window } from 'vscode';
import { Bookmark } from '../bookmark';
import { BookmarkManager } from '../bookmarkManager';
import { BookmarkTreeItem } from '../bookmarkTreeProvider';

export async function updateDisplayNameAsync(
  manager: BookmarkManager,
  treeView: TreeView<BookmarkTreeItem | undefined>,
  bookmark: Bookmark,
  name?: string,
): Promise<void> {
  const targetName =
    name !== undefined
      ? name
      : await window.showInputBox({
          prompt: 'Provide a new bookmark display name (leave empty to reset)',
          placeHolder: 'Enter a display name …',
          value: bookmark.hasDisplayName ? bookmark.displayName : '',
        });
  if (targetName !== undefined) {
    const updatedBookmark = await manager.updateBookmarkAsync(bookmark, {
      displayName: targetName.trim(),
    });
    await treeView.reveal(updatedBookmark, { focus: true });
  }
}
