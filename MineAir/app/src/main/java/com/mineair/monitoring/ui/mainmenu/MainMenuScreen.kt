package com.mineair.monitoring.ui.mainmenu

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mineair.monitoring.data.ModelEntry
import com.mineair.monitoring.ui.theme.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Composable-аналог сцены MainMenu.tscn: шапка с заголовком, панель действий
 * (кнопки "Добавить"/"Открыть"/"Удалить"), список моделей, инфо-панель со статусом.
 *
 * [onOpenModel] вызывается при нажатии "Открыть" — Activity сама решает, как
 * запускать MineSceneActivity (нужен доступ к Context/Intent).
 */
@Composable
fun MainMenuScreen(
    onOpenModel: (ModelEntry) -> Unit,
    viewModel: MainMenuViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        uri?.let { viewModel.addModel(it) }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark)
            .systemBarsPadding()   // отступы под статус-бар и нав-панель
            .padding(12.dp)
    ) {
        Header()

        Spacer(modifier = Modifier.height(10.dp))

        ActionPanel(
            openEnabled = state.selectedIndex in state.models.indices,
            removeEnabled = state.selectedIndex in state.models.indices,
            onAddClick = {
                // ".erp" — не стандартный MIME-тип, поэтому берём "*/*" и фильтруем
                // видимость по расширению уже в самом диалоге не получится —
                // это ограничение SAF, можно доработать через EXTRA_MIME_TYPES.
                filePickerLauncher.launch(arrayOf("*/*"))
            },
            onOpenClick = { viewModel.getSelectedModel()?.let(onOpenModel) },
            onRemoveClick = { viewModel.requestRemove(state.selectedIndex) }
        )

        Spacer(modifier = Modifier.height(10.dp))

        ModelListPanel(
            models = state.models,
            selectedIndex = state.selectedIndex,
            modelExists = { viewModel.modelExists(it) },
            onSelect = { viewModel.selectModel(it) },
            onActivate = { index ->
                viewModel.selectModel(index)
                viewModel.getSelectedModel()?.let(onOpenModel)
            },
            modifier = Modifier.weight(1f)
        )

        Spacer(modifier = Modifier.height(10.dp))

        InfoPanel(
            selectedModel = state.models.getOrNull(state.selectedIndex),
            status = state.status
        )
    }

    if (state.pendingRemoveIndex in state.models.indices) {
        val model = state.models[state.pendingRemoveIndex]
        AlertDialog(
            onDismissRequest = { viewModel.cancelRemove() },
            title = { Text("Удаление модели") },
            text = { Text("Удалить '${model.name}'?") },
            confirmButton = {
                TextButton(onClick = { viewModel.confirmRemove() }) {
                    Text("Удалить", color = StatusRed)
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.cancelRemove() }) {
                    Text("Отмена")
                }
            }
        )
    }
}

@Composable
private fun Header() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(70.dp)
            .background(HeaderDark, RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "MineAir",
            color = Color.White,
            fontSize = 28.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun ActionPanel(
    openEnabled: Boolean,
    removeEnabled: Boolean,
    onAddClick: () -> Unit,
    onOpenClick: () -> Unit,
    onRemoveClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(PanelDark, RoundedCornerShape(12.dp))
            .padding(8.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Button(
            onClick = onAddClick,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue)
        ) {
            Text("➕ Добавить модель")
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Button(
                onClick = onOpenClick,
                enabled = openEnabled,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(containerColor = SecondaryGray)
            ) {
                Text("📂 Открыть")
            }
            Button(
                onClick = onRemoveClick,
                enabled = removeEnabled,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(containerColor = DangerRed)
            ) {
                Text("🗑️ Удалить")
            }
        }
    }
}

@Composable
private fun ModelListPanel(
    models: List<ModelEntry>,
    selectedIndex: Int,
    modelExists: (ModelEntry) -> Boolean,
    onSelect: (Int) -> Unit,
    onActivate: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(ListDark, RoundedCornerShape(8.dp))
    ) {
        if (models.isEmpty()) {
            Text(
                text = "Список моделей пуст",
                color = TextSecondary,
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(16.dp)
            )
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize()) {
                itemsIndexed(models) { index, model ->
                    val exists = modelExists(model)
                    val selected = index == selectedIndex

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                when {
                                    selected -> Color(0x662E5F99)
                                    !exists -> Color(0x804D3333)
                                    else -> Color.Transparent
                                }
                            )
                            .clickable {
                                // Повторный тап по уже выбранной модели открывает её —
                                // упрощённый аналог двойного клика (ItemActivated) из Godot-версии
                                if (selected) onActivate(index) else onSelect(index)
                            }
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (exists) model.name else "⚠️ ${model.name}",
                            color = Color.White,
                            fontSize = 15.sp,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun InfoPanel(selectedModel: ModelEntry?, status: StatusState) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 90.dp)
            .background(PanelDark, RoundedCornerShape(bottomStart = 16.dp, bottomEnd = 16.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        val info = if (selectedModel != null) {
            val dateStr = SimpleDateFormat("dd.MM.yyyy HH:mm", Locale.getDefault())
                .format(Date(selectedModel.loadDateMillis))
            "📁 ${selectedModel.name}\n📅 $dateStr"
        } else {
            "Модель не выбрана"
        }

        Text(text = info, color = TextSecondary, fontSize = 13.sp)

        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "●",
                color = if (status.isError) StatusRed else StatusGreen,
                fontSize = 10.sp,
                modifier = Modifier.padding(end = 6.dp)
            )
            Text(
                text = status.message,
                color = if (status.isError) StatusRed else StatusGreen,
                fontSize = 12.sp,
                textAlign = TextAlign.Start
            )
        }
    }
}
