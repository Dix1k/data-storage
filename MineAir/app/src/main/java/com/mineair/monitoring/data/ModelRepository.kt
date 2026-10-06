package com.mineair.monitoring.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Хранение списка загруженных моделей.
 *
 * В оригинале (Godot) список сохранялся в user://models.cfg через ConfigFile.
 * Здесь используется обычный JSON-файл во внутреннем хранилище приложения —
 * простой аналог, не требующий дополнительных зависимостей.
 */
class ModelRepository(context: Context) {

    private val configFile: File = File(context.filesDir, "models.json")

    fun loadModels(): List<ModelEntry> {
        if (!configFile.exists()) return emptyList()

        return try {
            val json = configFile.readText()
            val array = JSONArray(json)
            (0 until array.length()).map { i ->
                val obj = array.getJSONObject(i)
                ModelEntry(
                    name = obj.optString("name"),
                    uri = obj.optString("uri"),
                    extractFolder = obj.optString("extractFolder"),
                    schemaPath = obj.optString("schemaPath"),
                    loadDateMillis = obj.optLong("loadDateMillis")
                )
            }
        } catch (e: Exception) {
            // Повреждённый конфиг — не роняем приложение, просто начинаем с пустого списка
            emptyList()
        }
    }

    fun saveModels(models: List<ModelEntry>) {
        val array = JSONArray()
        models.forEach { model ->
            val obj = JSONObject()
            obj.put("name", model.name)
            obj.put("uri", model.uri)
            obj.put("extractFolder", model.extractFolder)
            obj.put("schemaPath", model.schemaPath)
            obj.put("loadDateMillis", model.loadDateMillis)
            array.put(obj)
        }
        configFile.writeText(array.toString())
    }
}
