package com.mineair.monitoring.ui.minescene

import android.graphics.Color
import android.opengl.GLSurfaceView
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.widget.FrameLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.lifecycle.lifecycleScope
import com.mineair.monitoring.data.MineTopology
import com.mineair.monitoring.importerp.SchemaXmlParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Экран схемы шахты: парсит schema.xml в фоне (см. SchemaXmlParser), затем
 * рендерит топологию через MineGLRenderer. Камера управляется пальцами:
 * - 1 палец, вертикальный свайп — спин вокруг Y (вращение "по горизонтали");
 * - 1 палец, горизонтальный свайп — наклон камеры (вращение "по вертикали");
 * - 2 пальца (щипок) — зум;
 * - 3 пальца — панорама (сдвиг сцены, без поворота и без зума).
 *
 * Режим жеста ("палец один — крутим", "три и больше — панорама") фиксируется
 * на всю сессию касания по МАКСИМАЛЬНОМУ числу одновременных пальцев, а не по
 * текущему instant-значению — иначе при плотно сведённых 3 пальцах (например,
 * когда их держат в один горизонтальный ряд) сенсор экрана может на долю
 * секунды "потерять" один из пальцев, и жест дёргается между панорамой и
 * вращением/зумом. Раз увидели 3+ пальцев — держим панораму до полного отрыва
 * всех пальцев от экрана (ACTION_UP/ACTION_CANCEL).
 */
class MineSceneActivity : ComponentActivity() {

    companion object {
        const val EXTRA_MODEL_NAME = "extra_model_name"
        const val EXTRA_SCHEMA_PATH = "extra_schema_path"

        private const val ROTATE_SENSITIVITY = 0.25f // градусов на пиксель перетаскивания
        private const val PAN_LOCK_POINTERS = 3
    }

    private var glSurfaceView: GLSurfaceView? = null
    private var renderer: MineGLRenderer? = null
    private lateinit var root: FrameLayout
    private lateinit var statusText: TextView

    // Референсные точки для расчёта дельты жеста между кадрами касания
    private var lastTouchX = 0f
    private var lastTouchY = 0f
    private var lastPanX = 0f
    private var lastPanY = 0f

    // Максимум одновременных пальцев, замеченный с начала текущей сессии касания
    // (сбрасывается только когда экран полностью "отпущен")
    private var sessionMaxPointers = 0

    private lateinit var scaleDetector: ScaleGestureDetector

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val modelName = intent.getStringExtra(EXTRA_MODEL_NAME) ?: "Модель"
        val schemaPath = intent.getStringExtra(EXTRA_SCHEMA_PATH) ?: ""
        title = modelName

        root = FrameLayout(this).apply { setBackgroundColor(Color.parseColor("#0F0F1A")) }
        statusText = TextView(this).apply {
            text = "Загрузка схемы…"
            setTextColor(Color.parseColor("#B3B3CC"))
            gravity = Gravity.CENTER
        }
        root.addView(
            statusText,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER
            )
        )
        setContentView(root)

        scaleDetector = ScaleGestureDetector(this, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
            override fun onScale(detector: ScaleGestureDetector): Boolean {
                // scaleFactor > 1 — пальцы раздвигаются (приблизить) → уменьшаем дистанцию камеры
                renderer?.onZoom(1f / detector.scaleFactor)
                glSurfaceView?.requestRender()
                return true
            }
        })

        loadAndRender(schemaPath)
    }

    private fun loadAndRender(schemaPath: String) {
        if (schemaPath.isEmpty()) {
            statusText.text = "Путь к схеме не найден"
            return
        }

        lifecycleScope.launch {
            val topology: MineTopology? = try {
                withContext(Dispatchers.IO) {
                    File(schemaPath).inputStream().use { SchemaXmlParser.parse(it) }
                }
            } catch (e: Exception) {
                Log.e("MineSceneActivity", "Ошибка парсинга schema.xml", e)
                null
            }

            if (topology == null || topology.edges.isEmpty()) {
                statusText.text = "Не удалось разобрать схему выработок"
                return@launch
            }

            root.removeView(statusText)

            val mineRenderer = MineGLRenderer(topology)
            renderer = mineRenderer

            val newGlSurfaceView = GLSurfaceView(this@MineSceneActivity).apply {
                setEGLContextClientVersion(2)
                setRenderer(mineRenderer)
                renderMode = GLSurfaceView.RENDERMODE_WHEN_DIRTY
                setOnTouchListener { _, event -> handleTouch(event) }
            }
            glSurfaceView = newGlSurfaceView
            root.addView(newGlSurfaceView)
            newGlSurfaceView.requestRender()
        }
    }

    private fun handleTouch(event: MotionEvent): Boolean {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                sessionMaxPointers = 1
                resetReferences(event)
            }
            MotionEvent.ACTION_POINTER_DOWN -> {
                sessionMaxPointers = maxOf(sessionMaxPointers, event.pointerCount)
                resetReferences(event)
            }
            MotionEvent.ACTION_POINTER_UP -> {
                // Палец убрали, но режим (если уже "залип" в панораму) не сбрасываем —
                // просто пересчитываем точки отсчёта под оставшиеся пальцы
                resetReferences(event)
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                sessionMaxPointers = 0
            }
            MotionEvent.ACTION_MOVE -> {
                when {
                    sessionMaxPointers >= PAN_LOCK_POINTERS -> {
                        val avgX = averageX(event)
                        val avgY = averageY(event)
                        renderer?.onPan(avgX - lastPanX, avgY - lastPanY)
                        lastPanX = avgX
                        lastPanY = avgY
                        glSurfaceView?.requestRender()
                    }
                    sessionMaxPointers == 1 && !scaleDetector.isInProgress -> {
                        val dx = event.x - lastTouchX
                        val dy = event.y - lastTouchY
                        // Вертикальный свайп → спин вокруг Y (yaw), горизонтальный → наклон (pitch)
                        renderer?.onRotate(-dy * ROTATE_SENSITIVITY, dx * ROTATE_SENSITIVITY)
                        lastTouchX = event.x
                        lastTouchY = event.y
                        glSurfaceView?.requestRender()
                    }
                }
            }
        }

        // Щипок отдаём ScaleGestureDetector всегда, кроме самого MOVE во время
        // "залипшей" панорамы — иначе случайное сведение 2 из 3 пальцев даст
        // ложный зум. DOWN/UP-события пропускаем в любом случае, чтобы у
        // детектора не зависало внутреннее состояние между жестами.
        val withholdFromScale = event.actionMasked == MotionEvent.ACTION_MOVE &&
            sessionMaxPointers >= PAN_LOCK_POINTERS
        if (!withholdFromScale) {
            scaleDetector.onTouchEvent(event)
        }

        return true
    }

    private fun resetReferences(event: MotionEvent) {
        lastTouchX = event.x
        lastTouchY = event.y
        lastPanX = averageX(event)
        lastPanY = averageY(event)
    }

    private fun averageX(event: MotionEvent): Float {
        var sum = 0f
        for (i in 0 until event.pointerCount) sum += event.getX(i)
        return sum / event.pointerCount
    }

    private fun averageY(event: MotionEvent): Float {
        var sum = 0f
        for (i in 0 until event.pointerCount) sum += event.getY(i)
        return sum / event.pointerCount
    }

    override fun onPause() {
        super.onPause()
        glSurfaceView?.onPause()
    }

    override fun onResume() {
        super.onResume()
        glSurfaceView?.onResume()
        glSurfaceView?.requestRender()
    }
}
