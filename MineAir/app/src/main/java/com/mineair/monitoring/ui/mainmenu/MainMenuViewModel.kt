package com.mineair.monitoring.ui.mainmenu

import android.app.Application
import android.content.Intent
import android.net.Uri
import android.webkit.MimeTypeMap
import androidx.documentfile.provider.DocumentFile
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.mineair.monitoring.data.ModelEntry
import com.mineair.monitoring.data.ModelRepository
import com.mineair.monitoring.importerp.ErpArchiveReader
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

/** Статус-строка внизу экрана: текст + признак ошибки (аналог SetStatus в MainMenu.cs). */
data class StatusState(val message: String, val isError: Boolean = false)

data class MainMenuUiState(
    val models: List<ModelEntry> = emptyList(),
    val selectedIndex: Int = -1,
    val status: StatusState = StatusState("Готов к работе"),
    val pendingRemoveIndex: Int = -1 // индекс модели, ожидающей подтверждения удаления
)

class MainMenuViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = ModelRepository(application)

    private val _uiState = MutableStateFlow(MainMenuUiState())
    val uiState: StateFlow<MainMenuUiState> = _uiState.asStateFlow()

    private var statusResetJob: kotlinx.coroutines.Job? = null

    init {
        val loaded = repository.loadModels()
        _uiState.value = _uiState.value.copy(models = loaded)
    }

    private fun setStatus(message: String, isError: Boolean = false) {
        _uiState.value = _uiState.value.copy(status = StatusState(message, isError))

        // Через 3 секунды возвращаем строку статуса к дефолтной/"выбрано", как в оригинале
        statusResetJob?.cancel()
        statusResetJob = viewModelScope.launch {
            delay(3000)
            val state = _uiState.value
            val idx = state.selectedIndex
            val fallback = if (idx in state.models.indices) {
                "Выбрана: ${state.models[idx].name}"
            } else {
                "Готов к работе"
            }
            _uiState.value = state.copy(status = StatusState(fallback, false))
        }
    }

    /** Аналог OnFileSelected: пользователь выбрал .erp через SAF-диалог. */
    fun addModel(uri: Uri) {
        val context = getApplication<Application>()
        val alreadyLoaded = _uiState.value.models.any { it.uri == uri.toString() }
        if (alreadyLoaded) {
            setStatus("Эта модель уже загружена", true)
            return
        }

        // Сохраняем разрешение на чтение этого Uri между запусками приложения
        try {
            context.contentResolver.takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION
            )
        } catch (_: SecurityException) {
            // Некоторые провайдеры не поддерживают персистентные разрешения — не критично
        }

        viewModelScope.launch {
            try {
                val reader = ErpArchiveReader()
                withContext(Dispatchers.IO) {
                    reader.load(context, uri)
                }

                val displayName = queryDisplayName(uri) ?: "Модель"
                val model = ModelEntry(
                    name = displayName,
                    uri = uri.toString(),
                    extractFolder = reader.extractFolder,
                    schemaPath = reader.schemaPath,
                    loadDateMillis = System.currentTimeMillis()
                )

                val newModels = _uiState.value.models + model
                _uiState.value = _uiState.value.copy(
                    models = newModels,
                    selectedIndex = newModels.lastIndex
                )
                persist()

                setStatus("✅ Модель '${model.name}' загружена")
            } catch (e: Exception) {
                setStatus("❌ ${e.message}", true)
            }
        }
    }

    fun selectModel(index: Int) {
        if (index !in _uiState.value.models.indices) return
        _uiState.value = _uiState.value.copy(selectedIndex = index)
        setStatus("Выбрана: ${_uiState.value.models[index].name}")
    }

    /** Аналог OnOpenModelPressed — вызывающая сторона (Composable) откроет MineSceneActivity. */
    fun getSelectedModel(): ModelEntry? {
        val state = _uiState.value
        return state.models.getOrNull(state.selectedIndex)
    }

    fun modelExists(model: ModelEntry): Boolean {
        val context = getApplication<Application>()
        return try {
            val doc = DocumentFile.fromSingleUri(context, Uri.parse(model.uri))
            doc?.exists() == true
        } catch (_: Exception) {
            false
        }
    }

    fun requestRemove(index: Int) {
        if (index !in _uiState.value.models.indices) return
        _uiState.value = _uiState.value.copy(pendingRemoveIndex = index)
    }

    fun cancelRemove() {
        _uiState.value = _uiState.value.copy(pendingRemoveIndex = -1)
    }

    fun confirmRemove() {
        val index = _uiState.value.pendingRemoveIndex
        if (index !in _uiState.value.models.indices) {
            _uiState.value = _uiState.value.copy(pendingRemoveIndex = -1)
            return
        }
        val model = _uiState.value.models[index]

        // Чистим распакованные файлы модели
        if (model.extractFolder.isNotEmpty()) {
            File(model.extractFolder).deleteRecursively()
        }

        val newModels = _uiState.value.models.toMutableList().apply { removeAt(index) }
        _uiState.value = _uiState.value.copy(
            models = newModels,
            selectedIndex = -1,
            pendingRemoveIndex = -1
        )
        persist()
        setStatus("🗑️ Модель удалена")
    }

    private fun persist() {
        repository.saveModels(_uiState.value.models)
    }

    private fun queryDisplayName(uri: Uri): String? {
        val context = getApplication<Application>()
        return try {
            val doc = DocumentFile.fromSingleUri(context, uri)
            val rawName = doc?.name ?: return null
            // Отрезаем расширение, как Path.GetFileNameWithoutExtension в оригинале
            val ext = MimeTypeMap.getFileExtensionFromUrl(rawName)
            if (ext.isNotEmpty() && rawName.endsWith(".$ext")) {
                rawName.removeSuffix(".$ext")
            } else {
                rawName
            }
        } catch (_: Exception) {
            null
        }
    }
}
