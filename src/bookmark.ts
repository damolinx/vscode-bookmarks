import * as vscode from "vscode";

/**
 * Supported Bookmark categories.
 */
export type BookmarkKind = 'global' | 'workspace';

/**
 * Bookmark.
 */
export class Bookmark {
  public readonly uri: vscode.Uri;
  public readonly kind: BookmarkKind;

  constructor(uri: vscode.Uri, kind: BookmarkKind) {
    this.uri = uri;
    this.kind = kind;
  }

  /**
   * Bookmark name usef for UI. This value is tied to the current workspace
   * so don't use to identify a  bookmark. 
   */
  public get name(): string {
    return vscode.workspace.asRelativePath(this.uri);
  }
}