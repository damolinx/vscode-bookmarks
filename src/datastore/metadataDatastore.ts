import * as vscode from 'vscode';
import {
  CONTAINER_SCHEME,
  Datastore,
  RawMetadata,
  RawDatastore,
  RawData,
} from './datastore';

export { RawMetadata } from './datastore';

export const CONTAINER_METADATA_KEY = 'container';

/**
 * This class virtualizes a {@link RawData}'s entry as a datastore for {@link RawData}.
 * This is currently only supported for {@link CONTAINER_SCHEME} URIs.
 */
class MetadataRawDatastore implements RawDatastore {
  public readonly uri: vscode.Uri;
  public readonly metadata: RawMetadata;
  private readonly metadataKey: keyof RawData;

  /**
   * Constructor.
   * @param uri Metadata Id.
   * @param metadata Metadata.
   * @param metadataKey Metadata-key being virtualized.
   */
  constructor(
    uri: vscode.Uri,
    metadata: RawMetadata,
    metadataKey: keyof RawData = CONTAINER_METADATA_KEY,
  ) {
    if (uri.scheme !== CONTAINER_SCHEME) {
      throw new Error(`Scheme must be '${CONTAINER_SCHEME}' but is '${uri.scheme}'`);
    }
    this.metadata = metadata;
    this.metadataKey = metadataKey;
    this.uri = uri;
  }

  /**
   * Gets the store state. `undefined` means there is no saved state.
   */
  get(): RawData | undefined {
    const container = this.metadata[this.metadataKey] as RawData | undefined;
    return container;
  }

  /**
   * Sets the store state. Using `undefined` as `state` clears any stored state.
   * @param state Store state. MUST NOT contain cyclic references.
   */
  setAsync(state?: RawData): void {
    if (state === undefined || Object.keys(state).length === 0) {
      delete this.metadata[CONTAINER_METADATA_KEY];
    } else {
      this.metadata[CONTAINER_METADATA_KEY] = state;
    }
  }
}

/**
 * This class uses a {@link vscode.Memento} as backing store extension data.
 */
export class MetadataDatastore extends Datastore<MetadataRawDatastore> {
  private readonly parent: Datastore;

  /**
   * Constructor.
   * @param uri Metadata Id.
   * @param metadata Metadata datastore
   * @param parent Parent datastore. This is needed because {@link MetadataDatastore}
   * virtualizes a metadata entry so this store is unable to persist data on its own.
   */
  constructor(uri: vscode.Uri, metadata: RawMetadata, parent: Datastore) {
    super(new MetadataRawDatastore(uri, metadata));
    this.parent = parent;
  }

  /**
   * Add new entries.
   * @param entries Entries to add.
   * @param override Allow overriding a matching entry, otherwise ignore.
   * @returns List of added URIs (no duplicates).
   */
  public async addAsync(
    entries: { uri: vscode.Uri; metadata?: RawMetadata }[],
    override = false,
  ): Promise<vscode.Uri[]> {
    const addedUris = await super.addAsync(entries, override);
    if (addedUris.length) {
      await this.parent.addAsync(
        [{ uri: this.rawStore.uri, metadata: this.rawStore.metadata }],
        true,
      );
    }
    return addedUris;
  }

  /**
   * Remove all data associated with `uris`.
   * @param uris URIs to remove (line data is significant).
   * @returns List of removed URIs (no duplicates).
   */
  public async removeAsync(uris: vscode.Uri | Iterable<vscode.Uri>): Promise<vscode.Uri[]> {
    const removedUris = await super.removeAsync(uris);
    if (removedUris) {
      await this.parent.addAsync(
        [{ uri: this.rawStore.uri, metadata: this.rawStore.metadata }],
        true,
      );
    }
    return removedUris;
  }

  /**
   * Remove all data.
   */
  public async removeAllAsync(): Promise<void> {
    await this.rawStore.setAsync(undefined);
    await this.parent.addAsync(
      [{ uri: this.rawStore.uri, metadata: this.rawStore.metadata }],
      true,
    );
  }

  /**
   * Replace `uri` with `replaceUri` in a single operation. If `uri` is not found,
   * no changes are made.
   * @param uri Source URI.
   * @param newUri Target URI.
   * @returns Metadata that was associated with `replaceUri`, if `uri` was found.
   */
  public async replaceAsync(
    uri: vscode.Uri,
    newUri: vscode.Uri,
  ): Promise<RawMetadata | undefined> {
    const replacedMetadata = await super.replaceAsync(uri, newUri);
    if (replacedMetadata) {
      await this.parent.addAsync(
        [{ uri: this.rawStore.uri, metadata: this.rawStore.metadata }],
        true,
      );
    }

    return replacedMetadata;
  }
}
