import * as vscode from 'vscode';
import { BookmarkContainer } from './bookmarkContainer';
import { RawMetadata } from './datastore/datastore';
import { NaturalComparer } from './tree/treeUtils';

export const BOOKMARK_DISPLAY_NAME_KEY = 'displayName';
export const BOOKMARK_NOTES_KEY = 'notes';

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
export interface BookmarkUpdate {
  displayName?: string;
  kind?: BookmarkKind;
  notes?: string;
  selection?: { start: number; end?: number };
}

/**
 * Bookmark.
 */
export class Bookmark {
  private _defaultName?: string;
  private _selection: { start: number; end?: number };
  private _uri: vscode.Uri;

  /**
   * Parent container.
   */
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

    const lineFragment = this._uri.fragment;
    if (lineFragment) {
      const rangeInfo = lineFragment.split('-');
      this._selection = {
        start: parseInt(rangeInfo[0].substring(1)) ?? DEFAULT_LINE_NUMBER,
        end: rangeInfo[1] ? parseInt(rangeInfo[1].substring(1)) : undefined,
      };
    } else {
      this._selection = { start: DEFAULT_LINE_NUMBER };
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
      return NaturalComparer.compare(this.kind, that.kind);
    }

    const thisA = this.displayName;
    const thisB = '';

    const thatA = that.displayName;
    const thatB = '';

    return (
      NaturalComparer.compare(thisA, thatA) ||
      NaturalComparer.compare(thisB, thatB) ||
      this.start - that.start ||
      (this.end ?? 0) - (that.end ?? 0)
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
    return (this.metadata[BOOKMARK_DISPLAY_NAME_KEY] as string | undefined) || this.defaultName;
  }

  /**
   * Set the bookmark name to use in UI elements.
   */
  private set displayName(value: string | undefined) {
    if (value) {
      this.metadata[BOOKMARK_DISPLAY_NAME_KEY] = value;
    } else {
      delete this.metadata[BOOKMARK_DISPLAY_NAME_KEY];
    }
  }

  /**
   * Checks if bookmark defines a custom display name.
   */
  public get hasDisplayName(): boolean {
    return !!this.metadata[BOOKMARK_DISPLAY_NAME_KEY];
  }

  public get id(): string {
    return [this.container.id, this.uri.toString(true)].join('/');
  }

  public get kind(): BookmarkKind {
    return this.container.kind;
  }

  public get lineMoniker(): 'cell' | 'line' {
    // Heuristic
    switch (this.uri.scheme) {
      case 'vscode-notebook':
      case 'vscode-notebook-cell':
        return 'cell';
      default:
        return 'line';
    }
  }

  public getDescription(): string {
    if (['vscode-notebook', 'vscode-notebook-cell'].includes(this.uri.scheme)) {
      return 'cell';
    }
    if (this.end && this.start !== this.end) {
      return `lines ${this.start} to ${this.end}`;
    }

    return `line ${this.start}`;
  }

  /**
   * Bookmark line number. When the URI represents a notebook cell this value
   * is 0-based, otherwise lines numbers are 1-based.
   */
  public get start(): number {
    return this._selection.start;
  }

  /**
   * Bookmark line number. When the URI represents a notebook cell this value
   * is 0-based, otherwise lines numbers are 1-based.
   */
  public get end(): number | undefined {
    return this._selection.end;
  }

  /**
   * Set Bookmark line number.
   */
  private set selection(value: { start: number; end?: number }) {
    if (this._selection.start !== value.start || this._selection.end !== value.end) {
      this._selection = value;
      this._uri = this._uri.with({
        fragment: `L${value.start}${value.end ? `-L${value.end}` : ''}`,
      });
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
   * Get notes associated with bookmark.
   */
  public get notes(): string | undefined {
    return this.metadata[BOOKMARK_NOTES_KEY] as string | undefined;
  }

  /**
   * Set notes associated with bookmark.
   */
  private set notes(value: string | undefined) {
    if (value) {
      this.metadata[BOOKMARK_NOTES_KEY] = value;
    } else {
      delete this.metadata[BOOKMARK_NOTES_KEY];
    }
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
  public with(change: BookmarkUpdate): Bookmark {
    let { displayName, kind, selection, notes } = change;
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
    if (selection === undefined) {
      selection = this._selection;
    }
    if (notes === undefined) {
      notes = this.notes;
    }

    if (
      this.displayName === displayName &&
      this.kind === kind &&
      this.start === selection.start &&
      this.end === selection.end &&
      this.notes === notes
    ) {
      return this;
    }

    const bookmark = new Bookmark(this.container, this.uri);
    if (displayName != undefined) {
      bookmark.displayName = displayName;
    }
    if (selection !== undefined) {
      bookmark.selection = selection;
    }
    if (notes !== undefined) {
      bookmark.notes = notes;
    }
    return bookmark;
  }
}
