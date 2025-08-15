import { commands, window, workspace } from 'vscode';
import { Bookmark, BookmarkKind } from '../bookmark';
import { BookmarkContainer } from '../bookmarkContainer';
import { BookmarkManager } from '../bookmarkManager';
import { CONTAINER_SCHEME } from '../datastore/datastore';

export const EXPORT_VERSION = '0.1';

export interface NestedHash {
  [key: string]: string | NestedHash;
}

export interface Export {
  version: string;
  timestamp?: number;
  data: NestedHash;
}

export async function exportBookmarks(manager: BookmarkManager, kind: BookmarkKind) {
  const items = manager.getRootContainer(kind).getItems();
  if (items.length === 0) {
    window.showWarningMessage(`No '${kind}' bookmarks to export.`);
    return;
  }

  const exportData: Export = {
    version: EXPORT_VERSION,
    timestamp: Date.now(),
    data: {},
  };

  exportItems(items, exportData.data);

  const document = await workspace.openTextDocument({
    language: 'json',
    content: JSON.stringify(exportData),
  });
  await window.showTextDocument(document);
  await commands.executeCommand('editor.action.formatDocument');
}

function exportItems(items: (Bookmark | BookmarkContainer)[], container: NestedHash): void {
  for (const item of items) {
    if (item instanceof BookmarkContainer) {
      const folder = {};
      // DO NOT use URL as it carries kind.
      container[`${CONTAINER_SCHEME}:${item.displayName}`] = folder;
      exportItems(item.getItems(), folder);
    } else {
      container[item.uri.toString()] = item.metadata as NestedHash;
    }
  }
}
