import { TreeView } from 'vscode';
import { Bookmark } from '../bookmark';
import { BookmarkManager } from '../bookmarkManager';
import { BookmarkTreeItem } from '../bookmarkTreeProvider';
import { BookmarkContainer } from '../bookmarkContainer';

export async function removeBookmarkOrFolderAsync(
  manager: BookmarkManager,
  treeView: TreeView<BookmarkTreeItem | undefined>,
  bookmark?: Bookmark,
): Promise<boolean> {
  const bookmarksToRemove: Array<Bookmark | BookmarkContainer> = [];
  if (bookmark) {
    bookmarksToRemove.push(bookmark);
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
