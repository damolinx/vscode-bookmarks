import { TreeView, window, workspace } from 'vscode';
import { Bookmark } from '../bookmark';
import { BookmarkManager } from '../bookmarkManager';
import { BookmarkTreeItem } from '../bookmarkTreeProvider';

export async function updateLineNumberAsync(
  manager: BookmarkManager,
  treeView: TreeView<BookmarkTreeItem | undefined>,
  bookmark: Bookmark,
): Promise<void> {
  const existingSelections = bookmark.container
    .getItems()
    .filter((b) => b instanceof Bookmark)
    .filter(
      (b) =>
        b.matchesUri(bookmark.uri, true) && (b.start !== bookmark.start || b.end !== bookmark.end),
    )
    .map((b) => ({ start: b.start, end: b.end }));

  const maxLineNumber = (
    await workspace.openTextDocument(bookmark.uri).then(
      (d) => d,
      () => undefined,
    )
  )?.lineCount;

  const result = await window.showInputBox({
    prompt: 'Update bookmark line or range',
    placeHolder: 'Provide a line or start-end line range (e.g. 42 or 10-20)',
    ignoreFocusOut: true,
    value: `${bookmark.start}${bookmark.end ? `-${bookmark.end}` : ''}`,
    validateInput: (value) => {
      const normalizedValue = value.trim();
      const [start, end] = parseValue(normalizedValue);
      if (
        normalizedValue.startsWith('-') ||
        start === undefined ||
        Number.isNaN(start) ||
        (end !== undefined && Number.isNaN(end)) ||
        (maxLineNumber !== undefined &&
          (start < 1 ||
            start > maxLineNumber ||
            (end !== undefined && (end < 1 || end > maxLineNumber))))
      ) {
        return maxLineNumber
          ? `Line values must be between 1 and ${maxLineNumber}`
          : 'Line values must be equal or greater than 1';
      }
      if (end <= start) {
        return 'End line must be greater than start line';
      }

      if (existingSelections.some((s) => start === s.start && end === s.end)) {
        return `Value conflicts with an existing bookmark in '${bookmark.container.displayName}' folder`;
      }
      return undefined;
    },
  });

  if (result !== undefined) {
    const [start, end] = parseValue(result);
    const updatedBookmark = await manager.updateBookmarkAsync(bookmark, {
      selection: {
        start,
        end,
      },
    });
    await treeView.reveal(updatedBookmark, { focus: true });
  }

  function parseValue(value: string): number[] {
    return value.split('-').filter(Boolean).map(Number);
  }
}
