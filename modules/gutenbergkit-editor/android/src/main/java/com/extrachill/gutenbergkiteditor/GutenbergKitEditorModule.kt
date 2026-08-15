package com.extrachill.gutenbergkiteditor

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class GutenbergKitEditorModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("GutenbergKitEditor")

        View(GutenbergKitEditorView::class) {
            Prop("initialTitle") { view: GutenbergKitEditorView, title: String ->
                view.initialTitle = title
            }

            Prop("initialContent") { view: GutenbergKitEditorView, content: String ->
                view.initialContent = content
            }

            Events("onReady", "onError")

            OnViewDidUpdateProps { view: GutenbergKitEditorView ->
                view.loadEditorIfNeeded()
            }

            AsyncFunction("requestContent") { view: GutenbergKitEditorView, promise: Promise ->
                view.requestContent(promise)
            }
        }
    }
}
