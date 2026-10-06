# MineAir (Android / Kotlin)

Приложение для мониторинга воздуха в рудниках. Написано на Kotlin +
Jetpack Compose, переписано из заготовки на Godot Engine (C#).

## Версии (зафиксированы, не менять без причины)

| Компонент | Версия |
|---|---|
| Android Gradle Plugin | 9.4.0 |
| Kotlin | 2.0.21 |
| Gradle | 9.6.0 |
| Gradle JDK | 21 |
| compileSdk / targetSdk | 34 |
| minSdk | 24 (Android 7.0+) |
| Jetpack Compose BOM | 2024.05.00 |
| Compose Compiler (Kotlin-плагин) | версия Kotlin (2.0.21) |

Эта связка проверена и совместима — если Android Studio предложит ещё раз
что-то обновить через диалог апгрейда, спроси прежде, чем соглашаться.

## Как открыть

1. Распакуй архив в любую папку.
2. Открой Android Studio → **Open** → выбери папку `MineAir` целиком.
3. Дождись Gradle Sync.
4. Жми **Run ▶**.

### Если Gradle Sync ругается на версию

Открой `gradle/wrapper/gradle-wrapper.properties` и убедись, что там:

```
distributionUrl=https\://services.gradle.org/distributions/gradle-9.6.0-bin.zip
```

Если Android Studio сама переписала на другую версию — верни как выше и
нажми **File → Sync Project with Gradle Files**.

## AGP 9 — что было применено при апгрейде с 8.13.1

Через Android Studio Upgrade Assistant проект переведён на AGP 9.4.0 +
Gradle 9.6.0 + Kotlin 2.0.21 со следующими настройками (сохраняют старое,
привычное поведение сборки, а не переключают на новые дефолты AGP 9 —
это осознанный выбор, чтобы не переписывать код под новый DSL):

**`build.gradle.kts` (корень)**
- AGP `9.4.0`, Kotlin (и `org.jetbrains.kotlin.plugin.compose`) `2.0.21`.
- Compose Compiler теперь отдельный Kotlin-плагин
  (`org.jetbrains.kotlin.plugin.compose`) — начиная с Kotlin 2.0 версия
  компилятора Compose привязана к версии Kotlin, старый
  `composeOptions.kotlinCompilerExtensionVersion` в `app/build.gradle.kts`
  убран за ненадобностью.

**`app/build.gradle.kts`**
- Добавлен плагин `org.jetbrains.kotlin.plugin.compose`.
- `buildFeatures.resValues = true` — явно включено (в AGP 9 по умолчанию
  выключено).

**`gradle.properties`** — опт-ауты из AGP 9 Upgrade Assistant (сохраняют
поведение AGP 8.13):

| Флаг | Что делает |
|---|---|
| `android.defaults.buildfeatures.resvalues=true` | Enable resValues build feature |
| `android.sdk.defaultTargetSdkToCompileSdkIfUnset=false` | Disable targetSdk defaults to compileSdk |
| `android.enableAppCompileTimeRClass=false` | Disable App Compile-Time R Class |
| `android.uniquePackageNames=false` | Allow non-unique package names |
| `android.dependency.useConstraints=true` | Enable Dependency Constraints |
| `android.r8.strictFullModeForKeepRules=false` | Disable R8 Strict Mode for Keep Rules |
| `android.r8.optimizedResourceShrinking=false` | Disable R8 Optimized Resource Shrinking |
| `android.builtInKotlin=false` | Disable built-in Kotlin support — проект продолжает использовать classic `org.jetbrains.kotlin.android` плагин, а не встроенную в AGP 9 компиляцию Kotlin |
| `android.newDsl=false` | Preserve the old (internal) AGP DSL APIs |

> Один пункт из твоего списка — **"Continue to allow \_\_\_ in the main
> manifest"** — не смог сопоставить с конкретным флагом: похоже, при
> копировании из диалога Upgrade Assistant потерялся тег в угловых
> скобках (они пропадают при вставке как обычный текст). Если он тебе
> нужен — пришли точный текст пункта из ассистента, добавлю флаг.

Обе стратегические опции (`newDsl=false`, `builtInKotlin=false`) Google
разрешает использовать вплоть до **AGP 10.0** (ожидается в середине
2026) — дальше их придётся всё-таки убрать и переехать на новый DSL/
встроенный Kotlin. Так что это временная, а не постоянная договорённость.

## Структура проекта

| Файл/папка | Что делает |
|---|---|
| `ui/mainmenu/MainMenuScreen.kt` + `MainMenuViewModel.kt` | Главный экран: список моделей, добавление/удаление, статус |
| `importerp/ErpArchiveReader.kt` | Распаковка `.erp` (zip) архива и поиск `schema.xml` |
| `importerp/SchemaXmlParser.kt` | Парсит `schema.xml` (слои → выработки → точки пути) в `data/MineTopology.kt` |
| `data/MineTopology.kt` | Модель топологии: `MineLayer`, `MineEdge` (выработка = путь точек + сечение S), `MineTopology` |
| `data/ModelRepository.kt` | Хранение списка загруженных моделей (JSON во внутренней памяти) |
| `ui/minescene/MineSceneActivity.kt` | Экран 3D-схемы: парсит `schema.xml` в фоне, обрабатывает жесты (вращение/зум) |
| `ui/minescene/MineGLRenderer.kt` | Рисует топологию на OpenGL ES 2.0, орбитальная камера |

## 3D-сцена шахты — как это работает сейчас

- Каждая выработка рисуется ломаной линией (`GL_LINES`) через свои точки,
  цвет — по слою (горизонт/ствол), как в исходном файле схемы.
- Ось Y в 3D = глубина/отметка (`data.z`), оси X/Z = плановые координаты
  (`data.x`/`data.y`) — как в горно-геологической съёмке.
- К вертикали применено преувеличение (`VERTICAL_EXAGGERATION` в
  `MineGLRenderer.kt`, сейчас ×4) — иначе реальный перепад высот
  (сотни метров) теряется на фоне планового охвата (километры).
- **Стартовый вид** — почти фронтальный (`yaw≈0°`, небольшой `pitch`),
  похожий на профильный чертёж из исходного ПО: дистанция камеры подобрана
  так, чтобы вся вытянутая по вертикали схема помещалась в кадр целиком, без
  наклонного искажения "3/4".
- **Управление камерой пальцами**:
  - 1 палец, **вертикальный** свайп — спин вокруг Y (вращение "по горизонтали");
  - 1 палец, **горизонтальный** свайп — наклон камеры (вращение "по вертикали");
  - 2 пальца (щипок) — приближение/отдаление;
  - 3 пальца — панорама: сдвиг сцены вверх/вниз/в стороны, без поворота и без
    зума. Режим "залипает" на всю сессию касания по максимальному числу
    одновременных пальцев (а не по текущему instant-значению) — иначе плотно
    сведённые 3 пальца в один ряд иногда на долю секунды детектируются как 2,
    и жест дёргается между панорамой и зумом/вращением.

## Что осталось доделать (TODO для диплома)

1. **Замер параметров воздуха** — модель данных, форма ввода,
   автодата/автонумерация, запоминание последнего набора включённых
   показателей (пункты 2 и 6 исходного ТЗ).
2. **Реальная геометрия вместо линий** — заменить `GL_LINES` на
   трубы/цилиндры радиуса из `crossSectionArea` (S, м²).
3. **Поиск выработки по названию + прозрачность по Z-срезу** (пункт 3 ТЗ).
4. **Экспорт в CSV** (пункт 4 ТЗ) — формат уже понятен из примера
   (`;` разделитель полей, `,` разделитель дробной части, UTF-8 с BOM).
5. Диалог выбора файла показывает все файлы (`*/*`) — SAF не умеет
   фильтровать по произвольному расширению `.erp`.
6. При случае стоит перевести `kotlinOptions { jvmTarget = "17" }` на
   новый `compilerOptions { jvmTarget.set(...) }` — старый DSL пока
   работает, но Kotlin 2.0+ считает его устаревшим.
