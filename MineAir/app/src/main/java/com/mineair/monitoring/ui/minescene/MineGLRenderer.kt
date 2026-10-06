package com.mineair.monitoring.ui.minescene

import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.opengl.Matrix
import com.mineair.monitoring.data.MineTopology
import com.mineair.monitoring.data.Point3D
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import java.nio.ShortBuffer
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/**
 * Рендерит распарсенную топологию шахты: каждая выработка (rib) — ломаная линия
 * (GL_LINES) через её точки, цвет берётся из цвета слоя (layer.colorHex).
 *
 * Камера — орбитальная вокруг смещаемой точки (pan-таргет), управляется извне
 * через [onRotate]/[onZoom]/[onPan] (вызывается из touch-обработчика в
 * MineSceneActivity): один палец крутит сцену вокруг таргета (вертикальный
 * свайп — спин вокруг Y, горизонтальный — наклон), щипок двумя пальцами
 * приближает/отдаляет, три пальца сдвигают сам таргет (панорама — без
 * поворота и без зума).
 *
 * Стартовый вид — почти фронтальный (yaw≈0, небольшой pitch), похожий на
 * профильный чертёж из исходного ПО схемы: дистанция камеры подобрана так,
 * чтобы вся вытянутая по вертикали схема (см. VERTICAL_EXAGGERATION)
 * помещалась в кадр целиком без наклонного искажения "3/4".
 *
 * Ось Y в 3D = глубина/отметка (data.z), оси X/Z = плановые координаты
 * (data.x/data.y) — как в горно-геологической съёмке (XY — план, Z — вертикаль).
 * Перепад высот в реальных данных (сотни метров) обычно намного меньше, чем
 * плановый охват (километры), поэтому к вертикали применяется отдельное
 * [VERTICAL_EXAGGERATION] — иначе схема выглядит почти плоской.
 *
 * TODO на будущее: заменить линии на цилиндры радиусом из crossSectionArea (S),
 * добавить прозрачность по срезу Z и поиск выработки по имени с подсветкой.
 */
class MineGLRenderer(topology: MineTopology) : GLSurfaceView.Renderer {

    private data class LineGroup(
        val vertexBuffer: FloatBuffer,
        val indexBuffer: ShortBuffer,
        val indexCount: Int,
        val color: FloatArray
    )

    private var programHandle = 0
    private val lineGroups: List<LineGroup> = buildLineGroups(topology)

    private val mvpMatrix = FloatArray(16)
    private val projectionMatrix = FloatArray(16)
    private val viewMatrix = FloatArray(16)

    // Состояние орбитальной камеры — меняется из onRotate/onZoom/onPan по касаниям пользователя.
    // Стартовый вид — почти фронтальный (как исходный чертёж-профиль), а не наклонный "3/4":
    // yaw=0, небольшой pitch, дистанция подобрана так, чтобы вся (растянутая по вертикали)
    // схема помещалась в кадр целиком.
    @Volatile private var yawDeg = 0f
    @Volatile private var pitchDeg = 4f
    @Volatile private var distance = DEFAULT_DISTANCE

    // Точка, вокруг которой камера вращается и на которую смотрит — двигается панорамой (3 пальца)
    @Volatile private var panX = 0f
    @Volatile private var panY = 0f
    @Volatile private var panZ = 0f

    private val minDistance = 2f
    private val maxDistance = DEFAULT_DISTANCE * 2.4f
    private val maxPitch = 89f
    private val minPitch = -89f

    companion object {
        private const val VERTEX_SHADER = """
            uniform mat4 uMvpMatrix;
            attribute vec4 aPosition;
            void main() {
                gl_Position = uMvpMatrix * aPosition;
            }
        """
        private const val FRAGMENT_SHADER = """
            precision mediump float;
            uniform vec4 uColor;
            void main() {
                gl_FragColor = uColor;
            }
        """
        private const val TARGET_SIZE = 6f // во сколько условных единиц вписываем план схемы
        private const val VERTICAL_EXAGGERATION = 4f // во сколько раз "приподнять" перепад высот для наглядности
        private const val PAN_SENSITIVITY = 0.0015f // подбери под себя, если панорама кажется слишком резкой/вялой
        private const val FOV_Y_DEGREES = 45f

        // Полная высота нормализованной сцены после преувеличения — она ФИКСИРОВАНА
        // (не зависит от конкретной модели, т.к. вертикаль всегда нормализуется в TARGET_SIZE
        // перед умножением на VERTICAL_EXAGGERATION), поэтому дистанцию камеры для фронтального
        // вида можно посчитать один раз для всех схем.
        private val DEFAULT_DISTANCE: Float = run {
            val verticalHalfExtent = TARGET_SIZE * VERTICAL_EXAGGERATION / 2f
            val halfFovYRad = Math.toRadians((FOV_Y_DEGREES / 2f).toDouble())
            (verticalHalfExtent / kotlin.math.tan(halfFovYRad)).toFloat() * 1.15f // с запасом по краям кадра
        }
    }

    /** Вызывается из touch-обработчика при перетаскивании одним пальцем. */
    fun onRotate(deltaYawDeg: Float, deltaPitchDeg: Float) {
        yawDeg = (yawDeg + deltaYawDeg) % 360f
        pitchDeg = (pitchDeg + deltaPitchDeg).coerceIn(minPitch, maxPitch)
    }

    /** Вызывается из ScaleGestureDetector при щипке. [factor] > 1 — отдалить, < 1 — приблизить. */
    fun onZoom(factor: Float) {
        distance = (distance * factor).coerceIn(minDistance, maxDistance)
    }

    /**
     * Вызывается из touch-обработчика при перетаскивании тремя пальцами.
     * [dxPixels]/[dyPixels] — смещение в экранных пикселях. Двигает саму
     * точку, вокруг которой камера вращается (без поворота и без зума) —
     * сдвиг идёт вдоль текущих "право"/"вверх" камеры, а не по мировым осям,
     * чтобы направление панорамы совпадало с тем, куда сейчас смотрит камера.
     */
    fun onPan(dxPixels: Float, dyPixels: Float) {
        val yawRad = Math.toRadians(yawDeg.toDouble())
        val pitchRad = Math.toRadians(pitchDeg.toDouble())

        val forward = normalize(
            (-cos(pitchRad) * sin(yawRad)).toFloat(),
            (-sin(pitchRad)).toFloat(),
            (-cos(pitchRad) * cos(yawRad)).toFloat()
        )
        val rightRaw = cross(forward[0], forward[1], forward[2], 0f, 1f, 0f)
        val right = normalize(rightRaw[0], rightRaw[1], rightRaw[2])
        val up = cross(right[0], right[1], right[2], forward[0], forward[1], forward[2])

        // Скорость панорамы пропорциональна текущей дистанции камеры — одинаковое
        // ощущение "скорости" что при близком зуме, что при далёком
        val panSpeed = distance * PAN_SENSITIVITY
        panX -= (right[0] * dxPixels - up[0] * dyPixels) * panSpeed
        panY -= (right[1] * dxPixels - up[1] * dyPixels) * panSpeed
        panZ -= (right[2] * dxPixels - up[2] * dyPixels) * panSpeed
    }

    private fun cross(ax: Float, ay: Float, az: Float, bx: Float, by: Float, bz: Float): FloatArray =
        floatArrayOf(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx)

    private fun normalize(x: Float, y: Float, z: Float): FloatArray {
        val len = kotlin.math.sqrt(x * x + y * y + z * z).coerceAtLeast(0.0001f)
        return floatArrayOf(x / len, y / len, z / len)
    }

    private fun buildLineGroups(topology: MineTopology): List<LineGroup> {
        if (topology.edges.isEmpty()) return emptyList()

        var minX = Float.MAX_VALUE; var maxX = -Float.MAX_VALUE
        var minY = Float.MAX_VALUE; var maxY = -Float.MAX_VALUE
        var minZ = Float.MAX_VALUE; var maxZ = -Float.MAX_VALUE
        for (edge in topology.edges) {
            for (p in edge.points) {
                minX = min(minX, p.x); maxX = max(maxX, p.x)
                minY = min(minY, p.y); maxY = max(maxY, p.y)
                minZ = min(minZ, p.z); maxZ = max(maxZ, p.z)
            }
        }
        val centerX = (minX + maxX) / 2f
        val centerY = (minY + maxY) / 2f
        val centerZ = (minZ + maxZ) / 2f

        // Горизонтальный масштаб — по плановому охвату (data.x / data.y)
        val horizontalExtent = maxOf(maxX - minX, maxY - minY, 1f)
        val horizontalScale = TARGET_SIZE / horizontalExtent
        // Вертикальный масштаб — по перепаду глубин (data.z), с преувеличением
        val verticalExtent = maxOf(maxZ - minZ, 1f)
        val verticalScale = (TARGET_SIZE / verticalExtent) * VERTICAL_EXAGGERATION

        fun toRender(p: Point3D): Triple<Float, Float, Float> {
            val rx = (p.x - centerX) * horizontalScale
            val ry = (p.z - centerZ) * verticalScale // глубина/отметка → вертикаль в 3D
            val rz = (p.y - centerY) * horizontalScale
            return Triple(rx, ry, rz)
        }

        val layerColors = topology.layers.associate { it.id to parseColor(it.colorHex) }
        val defaultColor = floatArrayOf(0.6f, 0.6f, 0.7f, 1f)

        return topology.edges
            .groupBy { it.layerId }
            .map { (layerId, edgesInLayer) ->
                val vertices = mutableListOf<Float>()
                val indices = mutableListOf<Short>()
                var cursor = 0

                for (edge in edgesInLayer) {
                    val start = cursor
                    for (p in edge.points) {
                        val (rx, ry, rz) = toRender(p)
                        vertices.add(rx); vertices.add(ry); vertices.add(rz)
                    }
                    for (i in 0 until edge.points.size - 1) {
                        indices.add((start + i).toShort())
                        indices.add((start + i + 1).toShort())
                    }
                    cursor += edge.points.size
                }

                val vertexBuffer = ByteBuffer.allocateDirect(vertices.size * 4)
                    .order(ByteOrder.nativeOrder()).asFloatBuffer()
                    .apply { put(vertices.toFloatArray()); position(0) }

                val indexBuffer = ByteBuffer.allocateDirect(indices.size * 2)
                    .order(ByteOrder.nativeOrder()).asShortBuffer()
                    .apply { put(indices.toShortArray()); position(0) }

                LineGroup(
                    vertexBuffer = vertexBuffer,
                    indexBuffer = indexBuffer,
                    indexCount = indices.size,
                    color = layerColors[layerId] ?: defaultColor
                )
            }
    }

    /** Цвет слоя хранится как "#AARRGGBB". */
    private fun parseColor(hex: String): FloatArray {
        return try {
            val clean = hex.removePrefix("#")
            val a = clean.substring(0, 2).toInt(16) / 255f
            val r = clean.substring(2, 4).toInt(16) / 255f
            val g = clean.substring(4, 6).toInt(16) / 255f
            val b = clean.substring(6, 8).toInt(16) / 255f
            floatArrayOf(r, g, b, a)
        } catch (_: Exception) {
            floatArrayOf(0.6f, 0.6f, 0.7f, 1f)
        }
    }

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        GLES20.glClearColor(0.06f, 0.06f, 0.1f, 1f)
        GLES20.glEnable(GLES20.GL_DEPTH_TEST)
        val vertexShader = compileShader(GLES20.GL_VERTEX_SHADER, VERTEX_SHADER)
        val fragmentShader = compileShader(GLES20.GL_FRAGMENT_SHADER, FRAGMENT_SHADER)
        programHandle = GLES20.glCreateProgram().also {
            GLES20.glAttachShader(it, vertexShader)
            GLES20.glAttachShader(it, fragmentShader)
            GLES20.glLinkProgram(it)
        }
    }

    override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
        GLES20.glViewport(0, 0, width, height)
        val aspect = width.toFloat() / height.toFloat()
        Matrix.perspectiveM(projectionMatrix, 0, FOV_Y_DEGREES, aspect, 0.1f, 300f)
    }

    override fun onDrawFrame(gl: GL10?) {
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT or GLES20.GL_DEPTH_BUFFER_BIT)

        // Позиция камеры по сферическим координатам вокруг центра сцены —
        // yaw/pitch/distance меняются снаружи через onRotate/onZoom
        val yawRad = Math.toRadians(yawDeg.toDouble())
        val pitchRad = Math.toRadians(pitchDeg.toDouble())
        val eyeX = panX + (distance * cos(pitchRad) * sin(yawRad)).toFloat()
        val eyeY = panY + (distance * sin(pitchRad)).toFloat()
        val eyeZ = panZ + (distance * cos(pitchRad) * cos(yawRad)).toFloat()
        Matrix.setLookAtM(viewMatrix, 0, eyeX, eyeY, eyeZ, panX, panY, panZ, 0f, 1f, 0f)

        Matrix.multiplyMM(mvpMatrix, 0, projectionMatrix, 0, viewMatrix, 0)

        GLES20.glUseProgram(programHandle)
        val positionHandle = GLES20.glGetAttribLocation(programHandle, "aPosition")
        val colorHandle = GLES20.glGetUniformLocation(programHandle, "uColor")
        val mvpHandle = GLES20.glGetUniformLocation(programHandle, "uMvpMatrix")

        GLES20.glUniformMatrix4fv(mvpHandle, 1, false, mvpMatrix, 0)
        GLES20.glEnableVertexAttribArray(positionHandle)

        for (group in lineGroups) {
            GLES20.glVertexAttribPointer(positionHandle, 3, GLES20.GL_FLOAT, false, 0, group.vertexBuffer)
            GLES20.glUniform4fv(colorHandle, 1, group.color, 0)
            GLES20.glDrawElements(GLES20.GL_LINES, group.indexCount, GLES20.GL_UNSIGNED_SHORT, group.indexBuffer)
        }

        GLES20.glDisableVertexAttribArray(positionHandle)
    }

    private fun compileShader(type: Int, source: String): Int {
        return GLES20.glCreateShader(type).also { shader ->
            GLES20.glShaderSource(shader, source)
            GLES20.glCompileShader(shader)
        }
    }
}
