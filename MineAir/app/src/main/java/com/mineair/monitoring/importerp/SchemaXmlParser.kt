package com.mineair.monitoring.importerp

import com.mineair.monitoring.data.MineEdge
import com.mineair.monitoring.data.MineLayer
import com.mineair.monitoring.data.MineTopology
import com.mineair.monitoring.data.Point3D
import org.w3c.dom.Element
import org.w3c.dom.Node
import java.io.InputStream
import javax.xml.parsers.DocumentBuilderFactory

/**
 * Парсер schema.xml в MineTopology.
 *
 * Структура файла: <layer> → <levels><layerLevel> → <ribs><rib fromNode=".." toNode="..">
 * — каждый rib это выработка, путь строится как fromNode → innerNodes (по index) → toNode.
 * Глубина (z) лежит в customFields каждой точки: "z" у innerNode, "RibEndNode.Depth" у
 * концевого узла. Сечение выработки — поле "Airflow.CrossSectionArea" (S, м²).
 */
object SchemaXmlParser {

    fun parse(input: InputStream): MineTopology {
        val doc = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(input)
        val root = doc.documentElement

        val layersContainer = elementChildren(root, "layers").firstOrNull()
        val layerEls = layersContainer?.let { elementChildren(it, "layer") } ?: emptyList()
        val layerInfos = layerEls.associate { layerEl ->
            layerEl.getAttribute("id") to MineLayer(
                id = layerEl.getAttribute("id"),
                name = layerEl.getAttribute("name"),
                colorHex = layerEl.getAttribute("color")
            )
        }

        // Все концевые узлы — тег ribEndNode нигде не вложен сам в себя, безопасно искать глобально
        val nodePositions = mutableMapOf<String, Point3D>()
        val ribEndNodeList = root.getElementsByTagName("ribEndNode")
        for (i in 0 until ribEndNodeList.length) {
            val el = ribEndNodeList.item(i) as? Element ?: continue
            val id = el.getAttribute("id")
            val x = el.getAttribute("x").toFloatOrNull() ?: continue
            val y = el.getAttribute("y").toFloatOrNull() ?: continue
            val z = fieldValue(el, "RibEndNode.Depth")?.toFloatOrNull() ?: 0f
            nodePositions[id] = Point3D(x, y, z)
        }

        // Все выработки — тег rib тоже не вложен сам в себя
        val edges = mutableListOf<MineEdge>()
        val ribList = root.getElementsByTagName("rib")
        for (i in 0 until ribList.length) {
            val ribEl = ribList.item(i) as? Element ?: continue

            val fromPoint = nodePositions[ribEl.getAttribute("fromNode")] ?: continue
            val toPoint = nodePositions[ribEl.getAttribute("toNode")] ?: continue

            val innerPoints = elementChildren(ribEl, "innerNodes").firstOrNull()
                ?.let { elementChildren(it, "ribNode") }
                ?.mapNotNull { rn ->
                    val index = rn.getAttribute("index").toIntOrNull() ?: return@mapNotNull null
                    val x = rn.getAttribute("x").toFloatOrNull() ?: return@mapNotNull null
                    val y = rn.getAttribute("y").toFloatOrNull() ?: return@mapNotNull null
                    val z = fieldValue(rn, "z")?.toFloatOrNull() ?: 0f
                    index to Point3D(x, y, z)
                }
                ?.sortedBy { it.first }
                ?.map { it.second }
                ?: emptyList()

            val points = buildList {
                add(fromPoint)
                addAll(innerPoints)
                add(toPoint)
            }
            if (points.size < 2) continue

            edges.add(
                MineEdge(
                    id = ribEl.getAttribute("id"),
                    name = fieldValue(ribEl, "Rib.Name") ?: "",
                    crossSectionArea = fieldValue(ribEl, "Airflow.CrossSectionArea")?.toFloatOrNull(),
                    layerId = findAncestor(ribEl, "layer")?.getAttribute("id") ?: "",
                    points = points
                )
            )
        }

        return MineTopology(layers = layerInfos.values.toList(), edges = edges)
    }

    /** Значение поля из customFields/fields/field — ищет только среди ПРЯМЫХ детей [element],
     *  не спускаясь во вложенные innerNodes/ribItems, у которых есть свои customFields. */
    private fun fieldValue(element: Element, fieldName: String): String? {
        val customFields = elementChildren(element, "customFields").firstOrNull() ?: return null
        val fields = elementChildren(customFields, "fields").firstOrNull() ?: return null
        return elementChildren(fields, "field")
            .firstOrNull { it.getAttribute("name") == fieldName }
            ?.getAttribute("value")
            ?.takeIf { it.isNotEmpty() }
    }

    private fun elementChildren(parent: Element, tag: String): List<Element> {
        val result = mutableListOf<Element>()
        val children = parent.childNodes
        for (i in 0 until children.length) {
            val node = children.item(i)
            if (node is Element && node.tagName == tag) result.add(node)
        }
        return result
    }

    private fun findAncestor(node: Node, tag: String): Element? {
        var current = node.parentNode
        while (current != null) {
            if (current is Element && current.tagName == tag) return current
            current = current.parentNode
        }
        return null
    }
}
