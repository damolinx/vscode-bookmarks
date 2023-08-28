import { commands } from 'vscode';
import { Bookmark } from '../bookmark';
import { BookmarkContainer } from '../bookmarkContainer';

/**
 * Open folder bookmark as editors.
 */
export async function openFolderBookmarks(container: BookmarkContainer): Promise<void> {
  const openPromises = container
    .getItems()
    .filter((i): i is Bookmark => i instanceof Bookmark)
    .map((b) => commands.executeCommand('vscode.open', b.uri, { preview: false }));
  await Promise.all(openPromises);
}
