import * as vscode from 'vscode';
import { MetadataType, Datastore, RawDatastore, StoreType } from './datastore';

export { MetadataType } from './datastore';

export const CONTAINER_METADATA_KEY = 'container';

/**
 * This class virtualizes a {@link StoreType}'s entry as a datastore for {@link StoreType}.
 */
class MetadataRawDatastore implements RawDatastore {
  public readonly uri: vscode.Uri;
  public readonly metadata: MetadataType;
  private readonly metadataKey: keyof StoreType;

  constructor(
    uri: vscode.Uri,
    metadata: MetadataType,
    metadataKey: keyof StoreType = CONTAINER_METADATA_KEY
  ) {
    this.metadata = metadata;
    this.metadataKey = metadataKey;
    this.uri = uri;
  }

  /**
   * Gets the store state. `undefined` means there is no saved state.
   */
  get(): StoreType | undefined {
    const container = <StoreType | undefined>this.metadata[this.metadataKey];
    return container;
  }

  /**
   * Sets the store state. Using `undefined` as `state` clears any stored state.
   * @param state Store state. MUST NOT contain cyclic references.
   */
  setAsync(state?: StoreType): void {
    if (state === undefined || Object.keys(state).length === 0) {
      delete this.metadata[CONTAINER_METADATA_KEY];
    } else {
      this.metadata[CONTAINER_METADATA_KEY] = state;
    }
  }
}

/**
 * This class uses a {@link vscode.Memento} as backing store for
 * bookmark data.
 */
export class MetadataDatastore extends Datastore<MetadataRawDatastore> {
  private readonly parent: Datastore;

  /**
   * Constructor.
   * @param metadata Metatadta data store
   * @param parent Parent data store.
   */
  constructor(uri: vscode.Uri, metadata: MetadataType, parent: Datastore) {
    super(new MetadataRawDatastore(uri, metadata));
    this.parent = parent;
  }

  /**
   * Add bookmarks.
   * @param entries Bookmarks to add.
   * @param override Allow overriding a matching bookmark definition, otherwise ignore.
   * @returns List of added URIs, no duplicates.
   */
  public async addAsync(
    entries: (vscode.Uri | [vscode.Uri, MetadataType])[],
    override: boolean = false
  ): Promise<vscode.Uri[]> {
    const addedUris = await super.addAsync(entries, override);
    if (addedUris.length) {
      await this.parent.addAsync([[this.rawStore.uri, this.rawStore.metadata]], true);
    }
    return addedUris;
  }

  /**
   * Remove bookmarks.
   * @param uris URIs to search for (line data is significant).
   * @returns List of removed bookmarks, no duplicates.
   */
  public async removeAsync(uris: vscode.Uri | Iterable<vscode.Uri>): Promise<vscode.Uri[]> {
    const removedUris = await super.removeAsync(uris);
    if (removedUris) {
      await this.parent.addAsync([[this.rawStore.uri, this.rawStore.metadata]], true);
    }
    return removedUris;
  }

  /**
   * Remove all bookmarks.
   */
  public async removeAllAsync(): Promise<void> {
    await this.rawStore.setAsync(undefined);
    await this.parent.addAsync([[this.rawStore.uri, this.rawStore.metadata]], true);
  }

  /**
   * Replace `uri` with `replaceUri` in a single operation. If `uri` is not found,
   * no chnages are made.
   * @param uri Source URI.
   * @param newUri Target URI.
   * @returns Metadata that was associated with `replaceUri`, if `uri` was found.
   */
  public async replaceAsync(
    uri: vscode.Uri,
    newUri: vscode.Uri
  ): Promise<MetadataType | undefined> {
    const replacedMetadata = await super.replaceAsync(uri, newUri);
    if (replacedMetadata) {
      await this.parent.addAsync([[this.rawStore.uri, this.rawStore.metadata]], true);
    }

    return replacedMetadata;
  }
}
