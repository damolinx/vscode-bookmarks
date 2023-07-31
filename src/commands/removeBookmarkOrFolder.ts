import { TreeView } from 'vscode';
import { Bookmark } from '../bookmark';
import { BookmarkManager } from '../bookmarkManager';
import { BookmarkTreeData } from '../bookmarkTreeProvider';
import { BookmarkContainer } from '../bookmarkContainer';

export async function removeBookmarkOrFolderAsync(
  manager: BookmarkManager,
  treeView: TreeView<BookmarkTreeData | undefined>,
  bookmark?: Bookmark
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
  return !!removed.length;
}
