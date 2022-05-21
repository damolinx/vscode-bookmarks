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

  constructor(uri: vscode.Uri, group: BookmarkGroup) {
    this.uri = uri;
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