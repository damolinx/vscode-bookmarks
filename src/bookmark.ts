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

  /**
   * Bookmark kind.
   */
  public readonly kind: BookmarkKind;
  /**
   * Metadata.
   */
  public readonly metadata: V1_BOOKMARK_METADATA;
  /**
   * Bookmark URI. Prefer this value to identify a bookmark.
   */
  public readonly uri: vscode.Uri;

  /** 
   * Constructor.
   * @param pathOrUri URI to bookmark.
   * @param kind Bookmark kind.
   * @param metadata Additional data.
   */
  constructor(pathOrUri: string | vscode.Uri, kind: BookmarkKind, metadata: V1_BOOKMARK_METADATA = {}) {
    this.kind = kind;
    this.metadata = metadata;
    this.uri = (pathOrUri instanceof vscode.Uri)
      ? pathOrUri : vscode.Uri.parse(pathOrUri);

    const lineFragment = this.uri.fragment.substring(1);
    if (lineFragment) {
      this._lineNumber = parseInt(lineFragment);
    }
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
   * Tests whether `uri` matches current bookmark.
   * @param uri URI to test against. 
   * @param ignoreLineNumber Ignore line-number information.
   */
  public matchesUri(uri: vscode.Uri, ignoreLineNumber?: boolean): boolean {
    return uri.authority === this.uri.authority
      && uri.path === this.uri.path
      && (ignoreLineNumber || uri.fragment === this.uri.fragment);
  }
}