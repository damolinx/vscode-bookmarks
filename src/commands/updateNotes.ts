import { TreeView, window } from 'vscode';
import { Bookmark } from '../bookmark';
import { BookmarkManager } from '../bookmarkManager';
import { BookmarkTreeData } from '../bookmarkTreeProvider';

export async function updateNotesAsync(
  manager: BookmarkManager,
  _treeView: TreeView<BookmarkTreeData | undefined>,
  bookmark: Bookmark,
  notes?: string,
): Promise<void> {
  const currentNote = bookmark.notes;
  const targetNotes =
    notes !== undefined
      ? notes
      : await window.showInputBox({
          prompt: 'Add bookmark notes',
          placeHolder: 'Enter notes …',
          value: currentNote,
          validateInput: (value) =>
            value.trim().length === 0 ? 'Notes cannot be empty' : undefined,
        });
  const trimmedTargetNotes = targetNotes?.trim();
  if (trimmedTargetNotes) {
    await manager.updateBookmarkAsync(bookmark, {
      notes: trimmedTargetNotes.trim(),
    });
  }
}
