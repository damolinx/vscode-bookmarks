import { TreeView, window } from 'vscode';
import { Bookmark } from '../bookmark';
import { BookmarkManager } from '../bookmarkManager';
import { BookmarkTreeData } from '../bookmarkTreeProvider';

export async function updateDisplayNameAsync(
  manager: BookmarkManager,
  treeView: TreeView<BookmarkTreeData | undefined>,
  bookmark: Bookmark,
  name?: string,
): Promise<void> {
  const targetName =
    name !== undefined
      ? name
      : await window.showInputBox({
          prompt: 'Provide a new bookmark display name',
          placeHolder: 'Enter a display name …',
          value: bookmark.hasDisplayName ? bookmark.displayName : '',
          validateInput: (value) =>
            value.trim().length === 0 ? 'Name cannot be empty' : undefined,
        });
  if (targetName !== undefined) {
    const updatedBookmark = await manager.updateBookmarkAsync(bookmark, {
      displayName: targetName.trim(),
    });
    await treeView.reveal(updatedBookmark, { focus: true });
  }
}
