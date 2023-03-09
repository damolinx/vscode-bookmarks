import * as vscode from 'vscode';
import { BookmarkKind } from './bookmark';
import { BookmarkDatastore } from './bookmarkDatastore';
import { BookmarkGroup } from './bookmarkGroup';
import { MetadataDatastore } from './datastore/metadataDatastore';

export class BookmarkFolder extends BookmarkGroup {
  public readonly uri: vscode.Uri;

  constructor(
    uri: vscode.Uri,
    name: string,
    kind: BookmarkKind,
    datastore: MetadataDatastore
  ) {
    super(name, new BookmarkDatastore(kind, datastore));
    this.uri = uri;
  }
}
