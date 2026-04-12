import * as vscode from 'vscode';
import { Bookmark } from '../bookmark';
import { BookmarkManager } from '../bookmarkManager';

export async function updateNotesAsync(
  manager: BookmarkManager,

  bookmark: Bookmark,
  notes2?: string,
): Promise<void> {
  const targetNotes =
    notes2 ??
    (await vscode.window.showInputBox({
      prompt: 'Add bookmark notes',
      placeHolder: 'Enter notes …',
      value: bookmark.notes,
      validateInput: (value) => (value.trim().length === 0 ? 'Notes cannot be empty' : undefined),
    }));
  if (targetNotes === undefined) {
    return;
  }

  await manager.updateBookmarkAsync(bookmark, {
    notes: targetNotes.trim(),
  });
}
