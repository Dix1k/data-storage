package com.mineair.monitoring

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.mineair.monitoring.ui.mainmenu.MainMenuScreen
import com.mineair.monitoring.ui.minescene.MineSceneActivity
import com.mineair.monitoring.ui.theme.MineAirTheme

/**
 * Точка входа приложения — аналог run/main_scene="MainMenu.tscn" в project.godot.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            MineAirTheme {
                MainMenuScreen(
                    onOpenModel = { model ->
                        val intent = Intent(this, MineSceneActivity::class.java).apply {
                            putExtra(MineSceneActivity.EXTRA_MODEL_NAME, model.name)
                            putExtra(MineSceneActivity.EXTRA_SCHEMA_PATH, model.schemaPath)
                        }
                        startActivity(intent)
                    }
                )
            }
        }
    }
}
