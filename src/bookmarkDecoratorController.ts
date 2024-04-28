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

  /**
   * Get decorator icon path.
   */
  public getIconPath(): string | vscode.Uri {
    switch (vscode.window.activeColorTheme.kind) {
      case vscode.ColorThemeKind.Dark:
      case vscode.ColorThemeKind.HighContrast:
        return this.context.asAbsolutePath('resources/images/dark/bookmark.svg');
      default:
        return this.context.asAbsolutePath('resources/images/light/bookmark.svg');
    }
  }

  private hideDecorators(): void {
    if (this.visibilityDisposable) {
      this.visibilityDisposable.dispose();
      this.visibilityDisposable = undefined;
    }
  }

  private showDecorators() {
    const decorationType = vscode.window.createTextEditorDecorationType({
      gutterIconPath: this.getIconPath(),
    });

    this.visibilityDisposable = vscode.Disposable.from(
      decorationType,
      vscode.window.onDidChangeVisibleTextEditors((editors) =>
        showDecorations(this.manager, editors),
      ),
      this.manager.onDidAddBookmark((items) =>
        refreshDecorations(
          this.manager,
          <Bookmark[]>items?.filter((i) => i instanceof Bookmark),
        ),
      ),
      this.manager.onDidRemoveBookmark((items) =>
        refreshDecorations(
          this.manager,
          <Bookmark[]>items?.filter((i) => i instanceof Bookmark),
        ),
      ),
    );
    refreshDecorations(this.manager);
    return;

    function refreshDecorations(manager: BookmarkManager, bookmarks?: Bookmark[]) {
      let affectedEditors: ReadonlyArray<vscode.TextEditor>;
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
      editors: ReadonlyArray<vscode.TextEditor>,
    ): void {
      editors.forEach((editor) => {
        const options: vscode.DecorationOptions[] = manager
          .getBookmarks({ ignoreLineNumber: true, uri: editor.document.uri })
          .filter((b) => b.lineNumber <= editor.document.lineCount)
          .map((bookmark) => ({
            range: editor.document.lineAt(bookmark.lineNumber - 1).range,
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
