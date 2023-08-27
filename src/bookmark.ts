import * as vscode from 'vscode';
import { RawMetadata } from './datastore/datastore';
import { BookmarkContainer } from './bookmarkContainer';

export const BOOKMARK_CUSTOM_NAME_METADATA_KEY = 'displayName';

/**
 * Supported Bookmark kinds.
 */
export type BookmarkKind = 'global' | 'workspace';

/**
 * Default line-number.
 */
export const DEFAULT_LINE_NUMBER = 1;

/**
 * Bookmark change.
 */
export type BOOKMARK_CHANGE = {
  displayName?: string | null;
  kind?: BookmarkKind;
  lineNumber?: number;
};

/**
 * Bookmark.
 */
export class Bookmark {
  private _defaultName?: string;
  private _lineNumber: number;
  private _uri: vscode.Uri;

  public readonly container: BookmarkContainer;
  /**
   * Metadata.
   */
  public readonly metadata: RawMetadata;

  /**
   * Constructor.
   * @param container Parent container.
   * @param pathOrUri URI to bookmark.
   * @param metadata Additional data.
   */
  constructor(
    container: BookmarkContainer,
    pathOrUri: string | vscode.Uri,
    metadata: RawMetadata = {},
  ) {
    this.container = container;
    this._uri = pathOrUri instanceof vscode.Uri ? pathOrUri : vscode.Uri.parse(pathOrUri);
    this.metadata = metadata;

    const lineFragment = this._uri.fragment.substring(1);
    if (lineFragment) {
      this._lineNumber = parseInt(lineFragment);
    } else {
      this._lineNumber = DEFAULT_LINE_NUMBER;
      this._uri = this._uri.with({ fragment: `L${DEFAULT_LINE_NUMBER}` });
    }
  }

  /**
   * Determine sort order of bookmarks.
   * @param that Bookmark to compare to.
   * @returns A negative value if this bookmark should be sorted before `that`,
   * zero if they're equal, and a positive value otherwise.
   */
  public compare(that: Bookmark) {
    if (this.kind !== that.kind) {
      return this.kind.localeCompare(that.kind);
    }

    const thisA = this.displayName;
    const thisB = '';

    const thatA = that.displayName;
    const thatB = '';

    return (
      thisA.localeCompare(thatA, undefined) ||
      thisB.localeCompare(thatB, undefined, { sensitivity: 'base' }) ||
      this.lineNumber - that.lineNumber
    );
  }

  /**
   * Bookmark name based on `uri`. This value changes based on
   * the current workspace so don't use as Id.
   */
  public get defaultName(): string {
    if (this._defaultName === undefined) {
      this._defaultName = vscode.workspace.asRelativePath(this.uri);
    }
    return this._defaultName;
  }

  /**
   * Get the bookmark name to use in UI elements.
   */
  public get displayName(): string {
    return (
      <string | undefined>this.metadata[BOOKMARK_CUSTOM_NAME_METADATA_KEY] ||
      this.defaultName
    );
  }

  /**
   * Set the bookmark name to use in UI elements.
   */
  private set displayName(value: string | undefined) {
    if (value) {
      this.metadata[BOOKMARK_CUSTOM_NAME_METADATA_KEY] = value;
    } else {
      delete this.metadata[BOOKMARK_CUSTOM_NAME_METADATA_KEY];
    }
  }

  /**
   * Checks if bookmark defines a custom display name.
   */
  public get hasDisplayName(): boolean {
    return !!this.metadata[BOOKMARK_CUSTOM_NAME_METADATA_KEY];
  }

  public get id(): string {
    return [this.container.id, this.uri].join('/');
  }

  public get kind(): BookmarkKind {
    return this.container.kind;
  }

  /**
   * Bookmark line number. Lines numbers are 1-based.
   */
  public get lineNumber(): number {
    return this._lineNumber;
  }

  /**
   * Set Bookmark line number.
   */
  private set lineNumber(value: number) {
    // TODO: validate positive integer (or really make this immutable).
    if (this._lineNumber !== value) {
      this._defaultName = undefined;
      this._lineNumber = value;
      this._uri = this._uri.with({ fragment: `L${value}` });
    }
  }

  /**
   * Tests whether `uri` matches current bookmark.
   * @param uri URI to test against.
   * @param ignoreLineNumber Ignore line-number information.
   */
  public matchesUri(uri: vscode.Uri, ignoreLineNumber?: boolean): boolean {
    return (
      uri.authority === this.uri.authority &&
      uri.path === this.uri.path &&
      (ignoreLineNumber || uri.fragment === this.uri.fragment)
    );
  }

  /**
   * Bookmark URI. Prefer this value to identify a bookmark.
   */
  public get uri(): vscode.Uri {
    return this._uri;
  }

  /**
   * Derive a {@link Bookmark} from `this` (similar to {@link Uri.with}).
   * @param change An object that describes a change.
   * @return A {@link Bookmark} that reflects the given change. Returns
   * `this` if there are no effective changes.
   */
  public with(change: BOOKMARK_CHANGE): Bookmark {
    let { displayName, kind, lineNumber } = change;
    if (displayName === undefined) {
      if (this.hasDisplayName) {
        displayName = this.displayName;
      }
    } else if (!displayName) {
      displayName = undefined;
    }
    if (kind === undefined) {
      kind = this.kind;
    }
    if (lineNumber === undefined) {
      lineNumber = this.lineNumber;
    }

    if (
      this.displayName === displayName &&
      this.kind === kind &&
      this.lineNumber === lineNumber
    ) {
      return this;
    }

    const bookmark = new Bookmark(this.container, this.uri);
    if (displayName != undefined) {
      bookmark.displayName = displayName;
    }
    if (lineNumber !== undefined) {
      bookmark.lineNumber = lineNumber;
    }
    return bookmark;
  }
}
