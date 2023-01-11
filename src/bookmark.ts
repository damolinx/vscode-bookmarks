import * as vscode from "vscode";

/**
 * Supported Bookmark kinds.
 */
export type BookmarkKind = 'global' | 'workspace';

/**
 * Default line-number when a
 */
export const DEFAULT_LINE_NUMBER = 1;

/**
 * Bookmark.
 */
export class Bookmark {
  /**
   * Bookmark kind.
   */
  public readonly kind: BookmarkKind;
  /**
   * Bookmark line number, if any. Lines numbers are 1-based. 
   * If URL defines no line number, this defaults to `DEFAULT_LINE_NUMBER`.
   */
  public readonly lineNumber: number;
  /**
   * Bookmark name based on `uri`. This value changes dynamically based on
   * the current workspace so don't use it as Id.
   */
  public readonly defaultName: string;
  /**
   * Bookmark URI. Prefer this value to identify a bookmark.
   */
  public readonly uri: vscode.Uri;

  /** 
   * Constructor.
   * @param pathOrUri URI to bookmark.
   * @param kind Bookmark kind.
   */
  constructor(pathOrUri: string | vscode.Uri, kind: BookmarkKind) {
    this.kind = kind;
    this.uri = (pathOrUri instanceof vscode.Uri)
      ? pathOrUri : vscode.Uri.parse(pathOrUri);

    const workspaceRelativePath = vscode.workspace.asRelativePath(this.uri);
    const lineFragment = this.uri.fragment.substring(1);

    if (lineFragment) {
      this.lineNumber = parseInt(lineFragment);
      this.defaultName = `${workspaceRelativePath}:${lineFragment}`;
    } else {
      this.lineNumber = DEFAULT_LINE_NUMBER;
      this.defaultName = workspaceRelativePath;
    }
  }

  /**
   * Get the bookmark name to use in UI elements.
   */
  public get displayName(): string {
    return this.defaultName;
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