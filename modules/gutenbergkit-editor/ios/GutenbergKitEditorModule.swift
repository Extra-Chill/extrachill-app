import ExpoModulesCore

public final class GutenbergKitEditorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GutenbergKitEditor")

    View(GutenbergKitEditorView.self) {
      Prop("initialTitle") { (view: GutenbergKitEditorView, title: String) in
        view.initialTitle = title
      }

      Prop("initialContent") { (view: GutenbergKitEditorView, content: String) in
        view.initialContent = content
      }

      Events("onReady", "onError")

      OnViewDidUpdateProps { (view: GutenbergKitEditorView) in
        view.loadEditorIfNeeded()
      }

      AsyncFunction("requestContent") { (view: GutenbergKitEditorView) async throws in
        try await view.requestContent()
      }
    }
  }
}
