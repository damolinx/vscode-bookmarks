import * as vscode from 'vscode';
import { Bookmark } from './bookmark';
import { BookmarkManager } from './bookmarkManager';

export class BookmarkDecoratorController implements vscode.Disposable {
  private readonly context: vscode.ExtensionContext;
  private visibilityDisposable?: vscode.Disposable;
  private readonly manager: BookmarkManager;

  /**
   * Constructor.
   * @param context Extension context.
   * @param manager Bookmark manager.
   */
  constructor(context: vscode.ExtensionContext, manager: BookmarkManager) {
    this.context = context;
    this.manager = manager;
  }

  /**
   * Dispose this object.
   */
  public dispose() {
    this.hideDecorators();
  }

  private hideDecorators(): void {
    if (this.visibilityDisposable) {
      this.visibilityDisposable.dispose();
      this.visibilityDisposable = undefined;
    }
  }

  private showDecorators() {
    const decorationType = vscode.window.createTextEditorDecorationType({
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      light: {
        gutterIconPath: this.context.asAbsolutePath('resources/images/light/bookmark.svg'),
      },
      dark: {
        gutterIconPath: this.context.asAbsolutePath('resources/images/dark/bookmark.svg'),
      },
    });

    this.visibilityDisposable = vscode.Disposable.from(
      decorationType,
      vscode.window.onDidChangeVisibleTextEditors((editors) =>
        showDecorations(this.manager, editors),
      ),
      vscode.workspace.onDidChangeTextDocument((event) => {
        // TODO: this can be optimzed to track lines changed, but more
        // importantly would be to add "auto-update" of bookmarks.
        const editor = vscode.window.visibleTextEditors.find((e) => event.document === e.document);
        if (editor) {
          showDecorations(this.manager, [editor]);
        }
      }),
      this.manager.onDidAddBookmark((items) =>
        refreshDecorations(this.manager, items?.filter((i) => i instanceof Bookmark) as Bookmark[]),
      ),
      this.manager.onDidRemoveBookmark((items) =>
        refreshDecorations(this.manager, items?.filter((i) => i instanceof Bookmark) as Bookmark[]),
      ),
    );
    refreshDecorations(this.manager);
    return;

    function refreshDecorations(manager: BookmarkManager, bookmarks?: Bookmark[]) {
      let affectedEditors: readonly vscode.TextEditor[];
      if (bookmarks?.length) {
        const visibleEditors = new Set<vscode.TextEditor>();
        bookmarks.forEach((bookmark) => {
          const visibleEditor = vscode.window.visibleTextEditors.find((editor) =>
            bookmark.matchesUri(editor.document.uri, true),
          );
          if (visibleEditor) {
            visibleEditors.add(visibleEditor);
          }
        });
        affectedEditors = [...visibleEditors];
      } else {
        affectedEditors = vscode.window.visibleTextEditors;
      }

      if (affectedEditors.length) {
        showDecorations(manager, affectedEditors);
      }
    }

    function showDecorations(
      manager: BookmarkManager,
      editors: readonly vscode.TextEditor[],
    ): void {
      editors.forEach((editor) => {
        const options: vscode.DecorationOptions[] = manager
          .getBookmarks({ ignoreLineNumber: true, uri: editor.document.uri })
          .filter((b) => b.start <= editor.document.lineCount)
          .map((bookmark) => ({
            range: editor.document.validateRange(
              new vscode.Range(bookmark.start - 1, 0, bookmark.start - 1, 0),
            ),
          }));
        editor.setDecorations(decorationType, options);
      });
    }
  }

  /**
   * Toggle visibility of Bookmark markers.
   * @return Resulting visibility.
   */
  public async toogleVisibilityAsync(): Promise<boolean> {
    if (this.visible) {
      this.hideDecorators();
    } else {
      this.showDecorators();
    }
    await vscode.commands.executeCommand(
      'setContext',
      'bookmarks.decorators.visible',
      this.visible,
    );
    return this.visible;
  }

  /**
   * Decorations are being displayed.
   */
  public get visible(): boolean {
    return !!this.visibilityDisposable;
  }
}
