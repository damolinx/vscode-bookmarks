import * as vscode from "vscode";

export type BookmarkKind = 'global' | 'workspace';

export class Bookmark {

  constructor(
    public readonly uri: vscode.Uri,
    public readonly kind?: BookmarkKind) {
  }

  public get name(): string {
    return vscode.workspace.asRelativePath(this.uri);
  }
}