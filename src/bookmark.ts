import * as vscode from "vscode";

/**
 * Supported Bookmark categories.
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
   * @param group Parent group.
   */
  constructor(pathOrUri: string | vscode.Uri, kind: BookmarkKind) {
    this.uri = (pathOrUri instanceof vscode.Uri)
      ? pathOrUri : vscode.Uri.parse(pathOrUri);
    this.kind = kind;
    const workspaceRelativePath = vscode.workspace.asRelativePath(this.uri)
    this.name = this.uri.fragment 
      ? `${workspaceRelativePath}:${this.uri.fragment.slice(1)}`
      : workspaceRelativePath;
  }
}