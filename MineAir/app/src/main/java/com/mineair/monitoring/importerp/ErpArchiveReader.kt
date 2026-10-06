package com.mineair.monitoring.importerp

import android.content.Context
import android.net.Uri
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import java.util.zip.ZipInputStream

/**
 * Kotlin-аналог Import/ERP/ErpArchiveReader.cs.
 *
 * На Android у нас нет прямого пути к файлу, выбранному через SAF — только
 * content:// Uri, поэтому распаковка идёт через ContentResolver.openInputStream,
 * а .erp (по сути zip) читается через ZipInputStream во внутренний кэш приложения.
 */
class ErpArchiveReader {

    var extractFolder: String = ""
        private set
    var schemaPath: String = ""
        private set

    /**
     * Распаковывает .erp архив по [erpUri] во внутренний кэш и ищет schema.xml.
     * Бросает исключение, если файл нельзя прочитать или схема не найдена
     * (аналогично поведению C#-версии).
     */
    fun load(context: Context, erpUri: Uri): Boolean {
        try {
            val baseDir = File(context.cacheDir, "MineAir")
            val target = File(baseDir, UUID.randomUUID().toString())
            target.mkdirs()
            extractFolder = target.absolutePath

            val resolver = context.contentResolver
            val input = resolver.openInputStream(erpUri)
                ?: throw java.io.FileNotFoundException("Не удалось открыть ERP файл: $erpUri")

            input.use { stream ->
                ZipInputStream(stream).use { zip ->
                    var entry = zip.nextEntry
                    while (entry != null) {
                        val outFile = File(target, entry.name)

                        // Защита от Zip Slip — не даём записи выходить за пределы папки распаковки
                        if (!outFile.canonicalPath.startsWith(target.canonicalPath + File.separator) &&
                            outFile.canonicalPath != target.canonicalPath
                        ) {
                            throw SecurityException("Некорректный путь внутри архива: ${entry.name}")
                        }

                        if (entry.isDirectory) {
                            outFile.mkdirs()
                        } else {
                            outFile.parentFile?.mkdirs()
                            FileOutputStream(outFile).use { fos ->
                                zip.copyTo(fos)
                            }
                        }
                        zip.closeEntry()
                        entry = zip.nextEntry
                    }
                }
            }

            val schema = target.walkTopDown().firstOrNull { it.isFile && it.name == "schema.xml" }
                ?: throw Exception("Файл схемы schema.xml не найден в архиве")

            schemaPath = schema.absolutePath
            return true
        } catch (e: Exception) {
            cleanup()
            throw e
        }
    }

    fun cleanup() {
        if (extractFolder.isNotEmpty()) {
            File(extractFolder).deleteRecursively()
        }
        extractFolder = ""
        schemaPath = ""
    }
}
