package com.mineair.monitoring.data

/**
 * Одна загруженная модель (аналог ModelEntry из MainMenu.cs).
 *
 * uri            — content:// URI выбранного .erp файла (SAF), персистентное разрешение
 *                  на него берётся в момент выбора файла.
 * extractFolder  — путь во внутреннем кэше приложения, куда распакован архив.
 * schemaPath     — путь к найденному schema.xml внутри extractFolder.
 * loadDateMillis — время загрузки (epoch millis), для отображения и сортировки.
 */
data class ModelEntry(
    val name: String,
    val uri: String,
    val extractFolder: String,
    val schemaPath: String,
    val loadDateMillis: Long
)
