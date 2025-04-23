import { window } from 'vscode';
import { BookmarkKind } from '../bookmark';
import { BookmarkManager } from '../bookmarkManager';
import { exportBookmarks } from './exportBookmarks';

export async function resetRootContainersAsync(
  manager: BookmarkManager,
  kind: BookmarkKind,
): Promise<void> {
  if (!manager.hasBookmarks(kind)) {
    window.showWarningMessage(`No ${kind ? `'${kind}' ` : ''}bookmarks to remove.`);
    return; // Nothing to do
  }

  const YES_OPTION = 'Yes';
  const EXPORT_FIRST_OPTION = 'Yes, but Export first';
  const NO_OPTION = 'No';

  const option = await window.showInformationMessage(
    `Are you sure you want to delete all ${kind ? `'${kind}' ` : ''}bookmarks?`,
    {
      modal: true,
      detail: 'You can export your data before deletion; otherwise, the action is irreversible.',
    },
    YES_OPTION,
    EXPORT_FIRST_OPTION,
    NO_OPTION,
  );

  if (option === NO_OPTION || option === undefined) {
    return; // User canceled
  }

  if (EXPORT_FIRST_OPTION) {
    await exportBookmarks(manager, kind);
  }

  await manager.removeAllBookmarksAsync(kind);
}
