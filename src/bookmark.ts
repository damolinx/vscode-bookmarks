import * as vscode from "vscode";
import * as path from "path";
import { V1_BOOKMARK_METADATA } from "./bookmarkDatastore";

const BOOKMARK_CUSTOM_NAME_METADATA_KEY = "displayName";

/**
 * Supported Bookmark kinds.
 */
export type BookmarkKind = 'global' | 'workspace';

/**
 * Default line-number.
 */
export const DEFAULT_LINE_NUMBER = 1;

/**
 * Bookmark.
 */
export class Bookmark {
  private _defaultName?: string;
  private _description?: string;
  private _lineNumber: number;
  private _uri: vscode.Uri;

  /**
   * Bookmark kind.
   */
  public readonly kind: BookmarkKind;
  /**
   * Metadata.
   */
  public readonly metadata: V1_BOOKMARK_METADATA;

  /** 
   * Constructor.
   * @param pathOrUri URI to bookmark.
   * @param kind Bookmark kind.
   * @param metadata Additional data.
   */
  constructor(pathOrUri: string | vscode.Uri, kind: BookmarkKind, metadata: V1_BOOKMARK_METADATA = {}) {
    this.kind = kind;
    this.metadata = metadata;
    this._uri = (pathOrUri instanceof vscode.Uri)
      ? pathOrUri : vscode.Uri.parse(pathOrUri);

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
   * @param that 
   * @returns A negative value if this bookmark should be sorted before `that`,
   * zero if they're equal, and a positive value otherwise. 
   */
  public compare(that: Bookmark) {
    if (this.kind !== that.kind) {
      return this.kind.localeCompare(that.kind);
    }

    const thisA = this.displayName;
    const thisB = this.hasDisplayName ? this.description : '';

    const thatA = that.displayName;
    const thatB = that.hasDisplayName ? that.description : '';

    return thisA.localeCompare(thatA, undefined) || thisB.localeCompare(thatB, undefined, {sensitivity: 'base'}) || this.lineNumber - that.lineNumber;
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
   * Get the bookmark description to use in UI elements.
   */
  public get description(): string {
    if (this._description === undefined) {
      this._description = this.hasDisplayName
        ? `…${path.join(...this.uri.fsPath.split(path.sep).splice(-2))}:${this.lineNumber}`
        : `line ${this.lineNumber}`;
    }
    return this._description;
  }

  /**
   * Get the bookmark name to use in UI elements.
   */
  public get displayName(): string {
    return this.metadata[BOOKMARK_CUSTOM_NAME_METADATA_KEY] || this.defaultName;
  }

  /**
   * Set the bookmark name to use in UI elements.
   */
  public set displayName(value: string | undefined) {
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

  /**
   * Bookmark line number. Lines numbers are 1-based.
   */
  public get lineNumber(): number {
    return this._lineNumber;
  }

  /**
   * Set Bookmark line number.
   */
  public set lineNumber(value: number) {
    // TODO: validate positive integer (or really make this immutable).    
    if (this._lineNumber !== value) {
      this._defaultName = undefined;
      this._description = undefined;
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
    return uri.authority === this.uri.authority
      && uri.path === this.uri.path
      && (ignoreLineNumber || uri.fragment === this.uri.fragment);
  }

  /**
   * Bookmark URI. Prefer this value to identify a bookmark.
   */
  public get uri(): vscode.Uri {
    return this._uri;
  }
}