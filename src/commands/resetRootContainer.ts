import { window } from 'vscode';
import { BookmarkKind } from '../bookmark';
import { BookmarkManager } from '../bookmarkManager';

export async function resetRootContainersAsync(
  manager: BookmarkManager,
  kind?: BookmarkKind
): Promise<void> {
  if (!manager.hasBookmarks(kind)) {
    return; // Nothing to do
  }

  if (
    (await window.showInformationMessage(
      `Are you sure you want to delete all ${kind ? `'${kind}' ` : ``}bookmarks?`,
      {
        modal: true,
        detail: 'This action is irreversible.',
      },
      'Yes',
      'No'
    )) === 'Yes'
  ) {
    await manager.removeAllBookmarksAsync(kind);
  }
}
