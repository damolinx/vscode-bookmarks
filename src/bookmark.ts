import * as vscode from "vscode";
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
  private _lineNumber?: number;
  private _uri: vscode.Uri;
  private _uriWithoutLineNumber: vscode.Uri;

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
      this._uriWithoutLineNumber = this._uri.with({ fragment: '' });
    } else {
      this._uriWithoutLineNumber = this._uri;
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

    if (this.hasDisplayName) {
      const comparison = this.displayName.localeCompare(that.displayName);
      if (comparison) {
        return comparison;
      }
    }
    return (this._uriWithoutLineNumber.toString().localeCompare(that._uriWithoutLineNumber.toString()) || this.lineNumber - that.lineNumber);
  }

  /**
   * Bookmark name based on `uri`. This value changes based on
   * the current workspace so don't use as Id.
   */
  public get defaultName(): string {
    if (!this._defaultName) {
      const workspaceRelativePath = vscode.workspace.asRelativePath(this.uri);
      this._defaultName = (this._lineNumber)
        ? `${workspaceRelativePath}:${this.lineNumber}`
        : workspaceRelativePath;
    }
    return this._defaultName;
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
   * Checks if bookmark defines a line number.
   */
  public get hasLineNumer(): boolean {
    return !!this._lineNumber;
  }

  /**
   * Bookmark line number, if any. Lines numbers are 1-based.
   * If URL defines no line number, this defaults to `DEFAULT_LINE_NUMBER`.
   */
  public get lineNumber(): number {
    return this._lineNumber ?? DEFAULT_LINE_NUMBER;
  }

  /**
   * Bookmark line number, if any. Lines numbers are 1-based.
   * If URL defines no line number, this defaults to `DEFAULT_LINE_NUMBER`.
   */
  public set lineNumber(value: number) {
    if (this._lineNumber !== value) {
      this._defaultName = undefined;
      this._uri = this.uri.with({ fragment: `L${value}` });
      this._lineNumber = value;
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