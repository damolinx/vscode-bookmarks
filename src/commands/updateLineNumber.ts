import { TreeView, window } from 'vscode';
import { Bookmark } from '../bookmark';
import { BookmarkManager } from '../bookmarkManager';
import { BookmarkTreeData } from '../bookmarkTreeProvider';

export async function updateLineNumberAsync(
  manager: BookmarkManager,
  treeView: TreeView<BookmarkTreeData | undefined>,
  bookmark: Bookmark
): Promise<void> {
  const existingLineNumbers = manager
    .getBookmarks({
      ignoreLineNumber: true,
      kind: bookmark.kind,
      uri: bookmark.uri,
    })
    .map((b) => (<Bookmark>b).lineNumber)
    .filter((l) => l !== bookmark.lineNumber);
  const lineNumber = await window.showInputBox({
    prompt: 'Update bookmark line number',
    placeHolder: 'Provide a line number',
    value: bookmark.lineNumber.toString(),
    validateInput: (value) => {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1) {
        return 'Line number must be an integer value greater than or equal to 1';
      }
      if (existingLineNumbers.includes(n)) {
        return 'Line number conflicts with an existing bookmark';
      }
      return undefined;
    },
  });
  if (lineNumber !== undefined) {
    const updatedBookmark = await manager.updateBookmarkAsync(bookmark, {
      lineNumber: Number(lineNumber),
    });
    await treeView.reveal(updatedBookmark, { focus: true });
  }
}
