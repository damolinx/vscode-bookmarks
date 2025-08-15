import { commands, QuickPickItem, TreeView, window } from 'vscode';
import { Bookmark } from '../bookmark';
import { BookmarkContainer } from '../bookmarkContainer';
import { BookmarkTreeItem, BookmarkTreeProvider } from '../bookmarkTreeProvider';

export async function search(
  treeProvider: BookmarkTreeProvider,
  treeView: TreeView<BookmarkTreeItem | undefined>,
) {
  const bookmarks = flattenTree(treeProvider).map((bookmark) => {
    return {
      bookmark,
      buttons: [],
      description: `line ${bookmark.lineNumber}`,
      detail: bookmark.container.id,
      label: bookmark.displayName,
    };
  });

  const selected = await window.showQuickPick(bookmarks, {
    matchOnDetail: true,
    placeHolder: 'Search bookmarks',
    onDidSelectItem: (item: QuickPickItem & { bookmark: Bookmark }) =>
      treeView.reveal(item.bookmark, { expand: true }),
  });
  if (!selected) {
    return;
  }

  await commands.executeCommand('vscode.open', selected.bookmark.uri);
}

function flattenTree(treeProvider: BookmarkTreeProvider): Bookmark[] {
  const entries: Bookmark[] = [];
  const items = treeProvider.getChildren(undefined);

  let item: BookmarkTreeItem | undefined;
  while ((item = items.shift())) {
    if (item instanceof BookmarkContainer) {
      items.unshift(...treeProvider.getChildren(item));
    } else {
      entries.push(item);
    }
  }
  return entries;
}
