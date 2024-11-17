import { TabInputText, TreeView, window } from 'vscode';
import { BookmarkKind } from '../bookmark';
import { BookmarkContainer } from '../bookmarkContainer';
import { BookmarkManager } from '../bookmarkManager';
import { BookmarkTreeItem } from '../bookmarkTreeProvider';
import { UNSUPPORTED_SCHEMES } from '../constants';

/**
 * Add a bookmark folder.
 */
export async function addBookmarkFolderAsync(
  manager: BookmarkManager,
  treeView: TreeView<BookmarkTreeItem | undefined>,
  parentOrKind: BookmarkContainer | BookmarkKind,
  includeAllOpen?: boolean,
): Promise<void> {
  const parent =
    parentOrKind instanceof BookmarkContainer
      ? parentOrKind
      : manager.getRootContainer(parentOrKind);

  const folderName = await window.showInputBox({
    prompt: 'Provide a folder name',
    placeHolder: 'Enter a folder name…',
    validateInput: (value) => {
      const normalized = value.trim();
      if (normalized.length === 0) {
        return 'Name cannot be empty';
      }
      if (
        parent
          .getItems()
          .some((i) => i instanceof BookmarkContainer && i.displayName === normalized)
      ) {
        return 'Folder already exists';
      }
      return;
    },
  });
  if (folderName) {
    const folder = await manager.addFolderAsync(parent, folderName);
    if (includeAllOpen) {
      await addOpenEditors(manager, folder);
    }

    // Max. recursive expansion is 3, and with current structure any second-level
    // subfolder hits this limit, so it is required to expand the parent (which
    // must be visible as this is only invoked via context menu today).
    await treeView.reveal(folder.container, { expand: true });
    await treeView.reveal(folder, { expand: true, select: true });
  }
}

async function addOpenEditors(
  manager: BookmarkManager,
  folder: BookmarkContainer,
): Promise<void> {
  const tabUris = window.tabGroups.activeTabGroup.tabs
    .filter((t) => t.input instanceof TabInputText)
    .map((t) => (<TabInputText>t.input).uri)
    .filter((uri) => !UNSUPPORTED_SCHEMES.includes(uri.scheme));

  await manager.addAsync(
    folder,
    ...tabUris.map((uri) => ({
      uri: uri.with({ fragment: 'L1' }),
    })),
  );
}
