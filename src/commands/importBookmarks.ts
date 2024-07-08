import { Uri, window, workspace } from 'vscode';
import { BookmarkKind } from '../bookmark';
import { BookmarkManager } from '../bookmarkManager';
import { Export, EXPORT_VERSION, NestedHash } from './exportBookmarks';
import { BookmarkContainer } from '../bookmarkContainer';
import { CONTAINER_SCHEME, RawMetadata } from '../datastore/datastore';

export async function importBookmarks(manager: BookmarkManager, kind: BookmarkKind): Promise<BookmarkContainer | undefined> {
  const paths = await window.showOpenDialog({
    canSelectMany: false,
    filters: { "JSON Data": ["json"] },
    title: "Select Exported Data"
  });
  if (!paths?.length) {
    return;
  }

  const exportData = await loadData(paths[0]);
  if (exportData?.version !== EXPORT_VERSION) {
    window.showErrorMessage("Unsupported data format or version.");
    return;
  }

  // For safety, always import under a folder
  const importContainer = await getImportTargetContainer(manager.getRootContainer(kind));
  if (!importContainer) {
    window.showErrorMessage("[BUG] Failed to create target folder to import data into.");
    return;
  }

  await importItems(exportData.data, importContainer);
  manager.refresh(importContainer);

  return importContainer;

}

async function getImportTargetContainer(parent: BookmarkContainer): Promise<BookmarkContainer | undefined> {
  const existingNames = parent.getItems()
    .filter((i) => i instanceof BookmarkContainer)
    .map((i) => i.displayName);

  let container: BookmarkContainer | undefined;
  for (let i = 0; i <= existingNames.length; i++) {
    const testName = `Import_${i + 1}`;
    if (!existingNames.includes(testName)) {
      const containerUri = BookmarkContainer.createUriForName(testName, parent);
      container = <BookmarkContainer>(await parent.addAsync({ uri: containerUri }))[0];
      break;
    }
  }
  return container;
}

async function importItems(items: NestedHash, parent: BookmarkContainer): Promise<void> {
  for (const entry of Object.entries(items)) {
    const uri = Uri.parse(entry[0], true);
    if (uri.scheme === CONTAINER_SCHEME) {
      const containerUri = BookmarkContainer.createUriForName(uri.path, parent);
      const container = <BookmarkContainer>(await parent.addAsync({ uri: containerUri }))[0];
      await importItems(<NestedHash>entry[1], container);
    } else {
      await parent.addAsync({ uri, metadata: <RawMetadata>entry[1] });
    }
  }
}

async function loadData(path: Uri): Promise<Export | undefined> {
  const document = await workspace.openTextDocument(path);
  try {
    return JSON.parse(document.getText());
  }
  catch (e) {
    console.error("Failed to import file", path.fsPath, e);
    return undefined;
  }
}