import * as vscode from 'vscode';
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
        return this.context.asAbsolutePath("resources/images/dark/bookmark.svg");
      default:
        return this.context.asAbsolutePath("resources/images/light/bookmark.svg");
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
      vscode.window.onDidChangeVisibleTextEditors((editors) => showDecoration(editors, this.manager))
    );
    showDecoration(vscode.window.visibleTextEditors, this.manager);
    return;

    function showDecoration(editors: ReadonlyArray<vscode.TextEditor>, manager: BookmarkManager): void {
      editors.forEach((editor) => {
        const options: vscode.DecorationOptions[] = manager
          .getBookmarks({ ignoreLineNumber: true, uri: editor.document.uri })
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
    await vscode.commands.executeCommand('setContext', 'bookmarks.decorators.visible', this.visible);
    return this.visible;
  }

  /**
 * Decorations are being displayed.
 */
  public get visible(): boolean {
    return !!this.visibilityDisposable;
  }
}