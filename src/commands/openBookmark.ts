import { commands, Range, workspace } from 'vscode';
import { Bookmark } from '../bookmark';

export enum BookmarkSelectionStyle {
  /**
   * Uses VS Code's default behavior: selects from the start of the first line
   * to the start of the last line (exclusive).
   */
  Default = 'default',

  /**
   * Selects entire lines from start to end, including the last line fully.
   */
  FullLine = 'fullLine',
}

/**
 * Open bookmark.
 */
export async function openBookmark(
  bookmark: Bookmark,
  selectionStyle?: BookmarkSelectionStyle,
): Promise<void> {
  let args: any = undefined;

  const targetSelectionStyle =
    selectionStyle ??
    workspace.getConfiguration().get('bookmarks.selectionStyle', BookmarkSelectionStyle.Default);
  if (targetSelectionStyle === BookmarkSelectionStyle.FullLine) {
    const selection = await getSelection();

    args = { selection };
  }

  await commands.executeCommand('vscode.open', bookmark.uri, args);

  async function getSelection() {
    let selection: Range | undefined;
    const document = await workspace
      .openTextDocument(bookmark.uri)
      .then(undefined, () => undefined);
    if (document) {
      const zeroStart = bookmark.start - 1;
      if (bookmark.end === undefined) {
        selection = document.lineAt(zeroStart).range;
      } else {
        const zeroEnd = bookmark.end - 1;
        selection = new Range(zeroStart, 0, zeroEnd, document.lineAt(zeroEnd).range.end.character);
      }
    }

    return selection;
  }
}
