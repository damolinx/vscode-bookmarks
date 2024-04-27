import { TreeView, window, workspace } from 'vscode';
import { Bookmark } from '../bookmark';
import { BookmarkManager } from '../bookmarkManager';
import { BookmarkTreeItem } from '../bookmarkTreeProvider';

export async function updateLineNumberAsync(
  manager: BookmarkManager,
  treeView: TreeView<BookmarkTreeItem | undefined>,
  bookmark: Bookmark,
): Promise<void> {
  const existingLineNumbers = bookmark.container
    .getItems()
    .filter((b): b is Bookmark => b instanceof Bookmark)
    .filter((b) => b.matchesUri(bookmark.uri, true) && b.lineNumber !== bookmark.lineNumber)
    .map((b) => b.lineNumber);

  const maxLineNumber = (
    await workspace.openTextDocument(bookmark.uri).then(
      (d) => d,
      () => undefined,
    )
  )?.lineCount;

  const lineNumber = await window.showInputBox({
    prompt: 'Update bookmark line number',
    placeHolder: 'Provide a line number',
    value: bookmark.lineNumber.toString(),
    validateInput: (value) => {
      const n = Number(value);
      if (
        !Number.isInteger(n) ||
        n < 1 ||
        (maxLineNumber !== undefined && n > maxLineNumber)
      ) {
        return maxLineNumber
          ? `Line number must be an integer value between 1 and ${maxLineNumber}`
          : `Line number must be an integer value equal or greater than 1`;
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
