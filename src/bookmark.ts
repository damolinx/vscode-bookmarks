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
   * Bookmark line number, if any.
   */
  public readonly lineNumber: number | undefined;
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
    this.lineNumber = Object.is(NaN, lineNumber) ? undefined : lineNumber;

    const workspaceRelativePath = vscode.workspace.asRelativePath(this.uri);
    this.name = lineFragment
      ? `${workspaceRelativePath}:${lineFragment}`
      : workspaceRelativePath;
  }
}