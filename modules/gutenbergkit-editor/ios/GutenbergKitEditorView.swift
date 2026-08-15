import ExpoModulesCore
import GutenbergKit
import UIKit

@MainActor
final class GutenbergKitEditorView: ExpoView, EditorViewControllerDelegate {
  let onReady = EventDispatcher()
  let onError = EventDispatcher()

  var initialTitle = ""
  var initialContent = ""

  private var editor: EditorViewController?
  private var isReady = false
  private var latestTitle = ""
  private var latestContent = ""
  private var snapshotTask: Task<Void, Never>?
  private var forwardsAppearance = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
  }

  func loadEditorIfNeeded() {
    guard editor == nil else {
      return
    }

    let siteURL = URL(string: "https://example.invalid")!
    let configuration = EditorConfigurationBuilder(
      title: initialTitle,
      content: initialContent,
      postType: .post,
      siteURL: siteURL,
      siteApiRoot: siteURL.appending(path: "wp-json")
    )
      .setIsOfflineModeEnabled(true)
      .setShouldUsePlugins(false)
      .setShouldUseThemeStyles(false)
      .build()

    let editor = EditorViewController(configuration: configuration)
    editor.delegate = self
    self.editor = editor
    latestTitle = initialTitle
    latestContent = initialContent

    attachEditorIfPossible()
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()

    if window == nil {
      detachEditor()
    } else {
      attachEditorIfPossible()
    }
  }

  private func attachEditorIfPossible() {
    guard
      let editor,
      editor.parent == nil,
      let containerController = reactViewController()
    else {
      return
    }
    let parentController = (containerController as? UINavigationController)?.visibleViewController ?? containerController

    let editorView = editor.view!
    editorView.translatesAutoresizingMaskIntoConstraints = false
    forwardsAppearance = parentController.viewIfLoaded?.window != nil
    if forwardsAppearance {
      editor.beginAppearanceTransition(true, animated: false)
    }
    parentController.addChild(editor)
    addSubview(editorView)
    NSLayoutConstraint.activate([
      editorView.leadingAnchor.constraint(equalTo: leadingAnchor),
      editorView.topAnchor.constraint(equalTo: topAnchor),
      editorView.trailingAnchor.constraint(equalTo: trailingAnchor),
      editorView.bottomAnchor.constraint(equalTo: bottomAnchor)
    ])
    editor.didMove(toParent: parentController)
    if forwardsAppearance {
      editor.endAppearanceTransition()
    }
  }

  private func detachEditor() {
    guard let editor else {
      return
    }

    if forwardsAppearance {
      editor.beginAppearanceTransition(false, animated: false)
    }
    editor.willMove(toParent: nil)
    editor.view.removeFromSuperview()
    editor.removeFromParent()
    if forwardsAppearance {
      editor.endAppearanceTransition()
      forwardsAppearance = false
    }
  }

  func requestContent() async throws -> [String: String] {
    guard isReady, let editor else {
      throw EditorNotReadyError()
    }

    let result = try await editor.getTitleAndContent()
    latestTitle = result.title
    latestContent = result.content
    return ["title": result.title, "content": result.content]
  }

  func editorDidLoad(_ viewController: EditorViewController) {
    isReady = true
    onReady([:])
  }

  func editor(_ viewController: EditorViewController, didFailToLoad error: Error) {
    onError(["message": error.localizedDescription])
  }

  func editor(_ viewController: EditorViewController, didEncounterCriticalError error: Error) {
    onError(["message": error.localizedDescription])
  }

  func editor(_ viewController: EditorViewController, didDisplayInitialContent content: String) {}
  func editor(_ viewController: EditorViewController, didUpdateContentWithState state: EditorState) {
    snapshotTask?.cancel()
    snapshotTask = Task { [weak self, weak viewController] in
      guard !Task.isCancelled, let self, let viewController else {
        return
      }
      guard let result = try? await viewController.getTitleAndContent() else {
        return
      }
      latestTitle = result.title
      latestContent = result.content
    }
  }
  func editor(_ viewController: EditorViewController, didUpdateHistoryState state: EditorState) {}
  func editor(_ viewController: EditorViewController, didUpdateFeaturedImage mediaID: Int) {}
  func editor(_ viewController: EditorViewController, didLogException error: GutenbergJSException) {}
  func editor(_ viewController: EditorViewController, didRequestMediaFromSiteMediaLibrary config: OpenMediaLibraryAction) {}
  func editor(_ viewController: EditorViewController, didTriggerAutocompleter type: String) {}
  func editor(_ viewController: EditorViewController, didOpenModalDialog dialogType: String) {}
  func editor(_ viewController: EditorViewController, didCloseModalDialog dialogType: String) {}
  func editor(_ viewController: EditorViewController, didLogNetworkRequest request: RecordedNetworkRequest) {}

  func editorDidRequestLatestContent(_ controller: EditorViewController) -> (title: String, content: String)? {
    (latestTitle, latestContent)
  }
}
