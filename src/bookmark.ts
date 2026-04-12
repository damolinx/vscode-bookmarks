import * as vscode from 'vscode';
import { posix } from 'path';
import { BookmarkContainer } from './bookmarkContainer';
import { RawMetadata } from './datastore/datastore';
import { NaturalComparer } from './tree/treeUtils';

export const BOOKMARK_DISPLAY_NAME_KEY = 'displayName' as const;
export const BOOKMARK_NOTES_KEY = 'notes' as const;

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
  notes?: string;
  selection?: { start: number; end?: number };
}

/**
 * Bookmark.
 */
export class Bookmark {
  private _defaultName?: string;
  private _id?: string;
  private _name?: string;
  public readonly selection: { readonly start: number; readonly end?: number };
  public readonly uri: vscode.Uri;

  /**
   * Constructor.
   * @param container Parent container.
   * @param pathOrUri URI to bookmark.
   * @param metadata Additional data.
   */
  constructor(
    public readonly container: BookmarkContainer,
    uri: vscode.Uri,
    public readonly metadata: RawMetadata = {},
  ) {
    const selection = this.parseLineFragment(uri);
    if (selection) {
      this.selection = Object.freeze(selection);
      this.uri = uri;
    } else {
      this.selection = Object.freeze({ start: DEFAULT_LINE_NUMBER });
      this.uri = uri.with({ fragment: `L${DEFAULT_LINE_NUMBER}` });
    }
  }

  /**
   * Determine sort order of bookmarks.
   * @param that Bookmark to compare to.
   * @returns A negative value if this bookmark should be sorted before `that`,
   * zero if they're equal, and a positive value otherwise.
   */
  public compare(that: Bookmark) {
    return (
      NaturalComparer.compare(this.kind, that.kind) ||
      NaturalComparer.compare(this.displayName, that.displayName) ||
      this.start - that.start ||
      (this.end ?? 0) - (that.end ?? 0)
    );
  }

  /**
   * Bookmark name based on `uri`. This value changes based on
   * the current workspace so don't use as Id.
   */
  public get defaultName(): string {
    this._defaultName ??= vscode.workspace.asRelativePath(this.uri);
    return this._defaultName;
  }

  /**
   * Get the bookmark name to use in UI elements.
   */
  public get displayName(): string {
    return (this.metadata[BOOKMARK_DISPLAY_NAME_KEY] as string | undefined) || this.defaultName;
  }

  /**
   * Checks if bookmark defines a custom display name.
   */
  public get hasDisplayName(): boolean {
    return !!this.metadata[BOOKMARK_DISPLAY_NAME_KEY];
  }

  /**
   * Unique id based on bookmakrk hierarchy
   */
  public get id(): string {
    this._id ??= [this.container.id, this.name].join('/');
    return this._id;
  }

  public get kind(): BookmarkKind {
    return this.container.kind;
  }

  public get lineMoniker(): 'cell' | 'line' {
    return this.isNotebook() ? 'cell' : 'line';
  }

  /**
   * Bookmark name from {@link uri}.
   */
  public get name(): string {
    this._name ??= `${posix.basename(this.uri.path)}:${this.start}${this.end !== undefined ? `:${this.end}` : ''}`;
    return this._name;
  }

  public getDescription(): string {
    if (this.isNotebook()) {
      return 'cell';
    }

    if (this.end && this.start !== this.end) {
      return `lines ${this.start} to ${this.end}`;
    }

    return `line ${this.start}`;
  }

  private isNotebook() {
    return this.uri.scheme.startsWith('vscode-notebook');
  }

  /**
   * Bookmark line number. When the URI represents a notebook cell this value
   * is 0-based, otherwise lines numbers are 1-based.
   */
  public get start(): number {
    return this.selection.start;
  }

  /**
   * Bookmark line number. When the URI represents a notebook cell this value
   * is 0-based, otherwise lines numbers are 1-based.
   */
  public get end(): number | undefined {
    return this.selection.end;
  }

  /**
   * Tests whether `uri` matches current bookmark.
   * @param uri URI to test against.
   * @param ignoreLineNumber Ignore line-number information.
   */
  public matchesUri(uri: vscode.Uri, ignoreLineNumber?: boolean): boolean {
    if (uri.authority !== this.uri.authority || uri.path !== this.uri.path) {
      return false;
    }

    if (ignoreLineNumber) {
      return true;
    }

    const thisSelection = this.selection;
    const thatSelection = this.parseLineFragment(uri) ?? { start: DEFAULT_LINE_NUMBER };
    return thatSelection.start === thisSelection.start && thatSelection.end === thisSelection.end;
  }

  /**
   * Get notes associated with bookmark.
   */
  public get notes(): string | undefined {
    return this.metadata[BOOKMARK_NOTES_KEY] as string | undefined;
  }

  private parseLineFragment(uri: vscode.Uri): { start: number; end?: number } | undefined {
    const match = /^L(\d+)(?:-L(\d+))?$/.exec(uri.fragment);
    if (!match) {
      return;
    }

    return {
      start: Number(match[1]),
      end: match[2] ? Number(match[2]) : undefined,
    };
  }

  /**
   * Derive a {@link Bookmark} from `this` (similar to {@link vscode.Uri.with}).
   * @param change An object that describes a change.
   * @return A {@link Bookmark} that reflects the given change. Returns
   * `this` if there are no effective changes.
   */
  public with(change: BookmarkUpdate): Bookmark {
    let changed = false;
    const metadata = { ...this.metadata };

    if (Object.hasOwn(change, 'displayName')) {
      const newDisplayName = change.displayName?.trim();
      if (newDisplayName !== metadata[BOOKMARK_DISPLAY_NAME_KEY]) {
        changed = true;
        if (newDisplayName) {
          metadata[BOOKMARK_DISPLAY_NAME_KEY] = newDisplayName;
        } else {
          delete metadata[BOOKMARK_DISPLAY_NAME_KEY];
        }
      }
    }

    if (Object.hasOwn(change, 'notes')) {
      const newNotes = change.notes?.trim();
      if (newNotes !== metadata[BOOKMARK_NOTES_KEY]) {
        changed = true;
        if (newNotes) {
          metadata[BOOKMARK_NOTES_KEY] = newNotes;
        } else {
          delete metadata[BOOKMARK_NOTES_KEY];
        }
      }
    }

    let uri = this.uri;
    if (Object.hasOwn(change, 'selection')) {
      const newFragment = change.selection
        ? `L${change.selection.start}${change.selection.end ? `-L${change.selection.end}` : ''}`
        : '';
      if (newFragment !== uri.fragment) {
        changed = true;
        uri = uri.with({
          fragment: newFragment,
        });
      }
    }

    const bookmark = changed ? new Bookmark(this.container, uri, metadata) : this;
    return bookmark;
  }
}
