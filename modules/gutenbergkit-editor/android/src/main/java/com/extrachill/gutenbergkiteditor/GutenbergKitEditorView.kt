package com.extrachill.gutenbergkiteditor

import android.content.Context
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.cancel
import org.wordpress.gutenberg.GutenbergView
import org.wordpress.gutenberg.model.EditorConfiguration
import org.wordpress.gutenberg.model.PostTypeDetails
import java.util.concurrent.atomic.AtomicReference

class GutenbergKitEditorView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
    val onReady by EventDispatcher()
    val onError by EventDispatcher()

    var initialTitle = ""
    var initialContent = ""

    private var scope = MainScope()
    private var editor: GutenbergView? = null
    private var isReady = false
    private val latestSnapshot = AtomicReference(EditorSnapshot("", ""))

    fun loadEditorIfNeeded() {
        if (editor != null) {
            return
        }

        val configuration = EditorConfiguration.builder(
            "https://example.invalid",
            "https://example.invalid/wp-json",
            PostTypeDetails.post
        )
            .setTitle(initialTitle)
            .setContent(initialContent)
            .setPlugins(false)
            .setThemeStyles(false)
            .setEnableOfflineMode(true)
            .build()

        val editor = GutenbergView(configuration, null, scope, context).apply {
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
            setEditorDidBecomeAvailable {
                isReady = true
                onReady(emptyMap())
            }
            setLatestContentProvider(object : GutenbergView.LatestContentProvider {
                override fun getLatestContent(): GutenbergView.LatestContent {
                    val snapshot = latestSnapshot.get()
                    return GutenbergView.LatestContent(snapshot.title, snapshot.content)
                }
            })
            setContentChangeListener {
                captureContent()
            }
        }
        latestSnapshot.set(EditorSnapshot(initialTitle, initialContent))
        this.editor = editor
        addView(editor)
    }

    fun requestContent(promise: Promise) {
        val editor = editor
        if (!isReady || editor == null) {
            promise.reject("ERR_EDITOR_NOT_READY", "The Gutenberg editor is not ready.", null)
            return
        }

        editor.getTitleAndContent(
            initialContent,
            object : GutenbergView.TitleAndContentCallback {
                override fun onResult(title: CharSequence, content: CharSequence) {
                    val snapshot = EditorSnapshot(title.toString(), content.toString())
                    latestSnapshot.set(snapshot)
                    promise.resolve(mapOf("title" to snapshot.title, "content" to snapshot.content))
                }
            },
            true
        )
    }

    private fun captureContent() {
        val editor = editor ?: return
        val originalContent = latestSnapshot.get().content
        editor.getTitleAndContent(
            originalContent,
            object : GutenbergView.TitleAndContentCallback {
                override fun onResult(title: CharSequence, content: CharSequence) {
                    latestSnapshot.set(EditorSnapshot(title.toString(), content.toString()))
                }
            },
            true
        )
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        loadEditorIfNeeded()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        removeAllViews()
        editor = null
        isReady = false
        scope.cancel()
        scope = MainScope()
    }

    private data class EditorSnapshot(val title: String, val content: String)
}
