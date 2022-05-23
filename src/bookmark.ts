import * as vscode from "vscode";
import { BookmarkGroup } from "./bookmarkGroup";

/**
 * Supported Bookmark categories.
 */
export type BookmarkKind = 'global' | 'workspace';

/**
 * Bookmark.
 */
export class Bookmark {
  public readonly uri: vscode.Uri;
  public readonly group: BookmarkGroup;

  /** 
   * Constructor.
   * @param pathOrUri URI to bookmark.
   * @param group Parent group.
   */
  constructor(pathOrUri: string | vscode.Uri, group: BookmarkGroup) {
    this.uri = (pathOrUri instanceof vscode.Uri)
      ? pathOrUri : vscode.Uri.parse(pathOrUri);
    this.group = group;
  }

  /**
   * Bookmark kind.
   */
  public get kind(): BookmarkKind {
    return this.group.kind;
  }

  /**
   * Bookmark name usef for UI. This value is tied to the current workspace
   * so don't use to identify a  bookmark. 
   */
  public get name(): string {
    return vscode.workspace.asRelativePath(this.uri);
  }
}