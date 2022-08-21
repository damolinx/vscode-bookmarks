import * as vscode from "vscode";

/**
 * Supported Bookmark kinds.
 */
export type BookmarkKind = 'global' | 'workspace';

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
   * If URL defines no line number, this defaults to 1.
   */
  public readonly lineNumber: number;
  /**
   * User-readable name. This value is tied to the current workspace
   * so don't use it as Id. 
   */
  public readonly name: string;
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

    const lineFragment = this.uri.fragment.substring(1);
    const lineNumber = parseInt(lineFragment);
    this.lineNumber = Object.is(NaN, lineNumber) ? 1 : lineNumber;

    const workspaceRelativePath = vscode.workspace.asRelativePath(this.uri);
    this.name = lineFragment
      ? `${workspaceRelativePath}:${lineFragment}`
      : workspaceRelativePath;
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