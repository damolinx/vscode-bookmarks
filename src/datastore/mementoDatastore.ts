import * as vscode from 'vscode';
import * as process from 'process';
import {
  CONTAINER_SCHEME,
  Datastore,
  RawMetadata,
  RawDatastore,
  RawData,
} from './datastore';

export { RawMetadata } from './datastore';

/**
 * Memento key name used up to v0.2.1.
 */
export const V0_MEMENTO_KEY_NAME = 'bookmarks';
/**
 * Data format used up to v0.2.1.
 */
export type V0StoreType = string[];

/**
 * Memento key name used from v0.3.0.
 */
export const V1_MEMENTO_KEY_NAME = 'bookmarks.v1';
/**
 * Metadata format used from v0.3.0.
 */
export type V1MetadataType = RawMetadata;
/**
 * Data format used from v0.3.0.
 */
export type V1StoreType = RawData;

/**
 * {@link vscode.Memento}-based datastore for {@link RawData}.
 */
class MementoRawDatastore implements RawDatastore {
  public readonly memento: vscode.Memento;

  constructor(memento: vscode.Memento) {
    this.memento = memento;
  }

  /**
   * Gets the store state. `undefined` means there is no saved state.
   */
  get(): RawData | undefined {
    return this.memento.get<V1StoreType>(V1_MEMENTO_KEY_NAME);
  }

  /**
   * Sets the store state. Using `undefined` as `state` clears any stored state.
   * @param state Store state. MUST NOT contain cyclic references.
   */
  setAsync(state?: RawData): Thenable<void> {
    if (process.env.VSCODE_EXT_BOOKMARKS_DEBUG === 'true') {
      console.log(JSON.stringify(state));
    }
    return this.memento.update(V1_MEMENTO_KEY_NAME, state);
  }
}

/**
 * This class uses a {@link vscode.Memento} as backing store for
 * bookmark data.
 */
export class MementoDatastore extends Datastore<MementoRawDatastore> {
  /**
   * Constructor.
   * @param memento Data store.
   */
  constructor(memento: vscode.Memento) {
    super(new MementoRawDatastore(memento));
  }

  /**
   * Upgrade datastore.
   */
  public async upgradeAsync(): Promise<boolean> {
    const tasks: Thenable<void>[] = [];
    const v1 = this.rawStore.memento.get<V1StoreType>(V1_MEMENTO_KEY_NAME, {});
    let saveV1 = false;

    // V0 upgrade
    const v0 = this.rawStore.memento.get<V0StoreType>(V0_MEMENTO_KEY_NAME);
    if (v0) {
      // Only copy URLs from v0 to v1 if they are not present already. If they
      // are present, upgrade has already happened perhaps on the edge case of
      // multiple VSCode instances running.
      for (const uri of v0) {
        if (!(uri in v1)) {
          v1[uri] = {};
          saveV1 = true;
        }
      }

      // Delete old store
      tasks.push(this.rawStore.memento.update(V0_MEMENTO_KEY_NAME, undefined));
    }

    // Fix URLs without line number info (pre-0.3.2)
    Object.keys(v1).forEach((uriStr) => {
      const uri = vscode.Uri.parse(uriStr);
      if (uri.scheme !== CONTAINER_SCHEME && !uri.fragment) {
        v1[uri.with({ fragment: 'L1' }).toString()] = v1[uriStr];
        delete v1[uriStr];
        saveV1 = true;
      }
    });

    if (saveV1 || tasks.length) {
      await Promise.all([this.rawStore.memento.update(V1_MEMENTO_KEY_NAME, v1), ...tasks]);
      return true;
    }

    return false;
  }
}
