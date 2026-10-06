package com.mineair.monitoring.data

/** Точка в реальных координатах schema.xml: x,y — план, z — глубина/отметка. */
data class Point3D(val x: Float, val y: Float, val z: Float)

/** Слой схемы (горизонт, ствол, поверхность...) — для группировки и цвета. */
data class MineLayer(
    val id: String,
    val name: String,
    val colorHex: String
)

/** Одна выработка (rib) — путь от узла до узла через промежуточные точки. */
data class MineEdge(
    val id: String,
    val name: String,
    val crossSectionArea: Float?,
    val layerId: String,
    val points: List<Point3D>
)

data class MineTopology(
    val layers: List<MineLayer>,
    val edges: List<MineEdge>
)
