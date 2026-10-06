package com.mineair.monitoring.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Цвета подобраны по значениям StyleBox* из MainMenu.tscn, чтобы визуально
// приложение осталось похоже на оригинальную Godot-версию.
val BackgroundDark = Color(0xFF0F0F1A)
val HeaderDark = Color(0xFF1A1A29)
val PanelDark = Color(0xFF141420)
val ListDark = Color(0xFF0D0D17)

val PrimaryBlue = Color(0xFF3373D9)
val PrimaryBluePressed = Color(0xFF2659B3)
val SecondaryGray = Color(0xFF262640)
val DangerRed = Color(0xFF992626)
val DangerRedPressed = Color(0xFF801A1A)
val StatusGreen = Color(0xFF4DCC4D)
val StatusRed = Color(0xFFFF4D4D)
val TextSecondary = Color(0xFFB3B3CC)

private val MineAirColorScheme = darkColorScheme(
    primary = PrimaryBlue,
    secondary = SecondaryGray,
    error = DangerRed,
    background = BackgroundDark,
    surface = PanelDark
)

@Composable
fun MineAirTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = MineAirColorScheme,
        content = content
    )
}
