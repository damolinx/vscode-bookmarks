import { TreeView } from 'vscode';
import { Bookmark } from '../bookmark';
import { BookmarkManager } from '../bookmarkManager';
import { BookmarkTreeItem } from '../bookmarkTreeProvider';
import { BookmarkContainer } from '../bookmarkContainer';

export async function removeBookmarkOrFolderAsync(
  manager: BookmarkManager,
  treeView: TreeView<BookmarkTreeItem | undefined>,
  bookmarkOrContainer?: Bookmark | BookmarkContainer,
): Promise<boolean> {
  const bookmarksToRemove: (Bookmark | BookmarkContainer)[] = [];
  if (bookmarkOrContainer) {
    bookmarksToRemove.push(bookmarkOrContainer);
  } else {
    treeView.selection.forEach((element) => {
      if (element && (element instanceof Bookmark || !element.isRoot)) {
        bookmarksToRemove.push(element);
      }
    });
  }

  const removed = await manager.removeBookmarksAsync(...bookmarksToRemove);
  return removed.length > 0;
}
