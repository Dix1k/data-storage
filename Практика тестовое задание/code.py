import pandas as pd
import os

# =========================
# 1. Проверка файлов
# =========================
if not os.path.exists("Активации.csv"):
    raise FileNotFoundError("Файл 'Активации.csv' не найден")
if not os.path.exists("Модели.csv"):
    raise FileNotFoundError("Файл 'Модели.csv' не найден")

# =========================
# 2. Чтение CSV
# =========================
def read_csv_safe(path):
    try:
        return pd.read_csv(path, encoding="utf-8")
    except:
        return pd.read_csv(path, encoding="cp1251")

act = read_csv_safe("Активации.csv")
mod = read_csv_safe("Модели.csv")

# =========================
# 3. Очистка колонок
# =========================
def clean_columns(df):
    df.columns = (
        df.columns
        .str.strip()
        .str.replace("\n", "", regex=True)
        .str.replace("\r", "", regex=True)
    )
    return df

act = clean_columns(act)
mod = clean_columns(mod)

# =========================
# 4. Поиск колонок
# =========================
def find_col(df, keywords):
    for col in df.columns:
        for k in keywords:
            if k.lower() in col.lower():
                return col
    raise ValueError(f"Не найдена колонка: {keywords}")

# Модели
mod_key = find_col(mod, ["ключ"])
mod_mac = find_col(mod, ["mac"])
mod_ip = find_col(mod, ["ip"])
mod_user = find_col(mod, ["учет", "польз"])
mod_pc = find_col(mod, ["пк", "pc"])
mod_date = find_col(mod, ["дата"])

# Активации
act_key = find_col(act, ["ключ"])
act_date = find_col(act, ["дата"])

# =========================
# 5. Приведение дат
# =========================
mod[mod_date] = pd.to_datetime(mod[mod_date], errors="coerce")
act[act_date] = pd.to_datetime(act[act_date], errors="coerce")

# =========================
# 6. Базовая агрегация
# =========================
summary = mod.groupby(mod_key).agg({
    mod_mac: "nunique",
    mod_ip: "nunique",
    mod_user: "nunique",
    mod_pc: "nunique"
}).reset_index()

summary.columns = ["Ключ", "MAC", "IP", "Пользователи", "ПК"]

# =========================
# 7. Активации
# =========================
act_counts = act.groupby(act_key).size().reset_index(name="Активации")
act_counts.columns = ["Ключ", "Активации"]

df = summary.merge(act_counts, on="Ключ", how="left")
df["Активации"] = df["Активации"].fillna(0).astype(int)

# =========================
# 8. Частота использования
# =========================
usage = mod.groupby(mod_key)[mod_date].agg([
    ("Всего_запусков", "count"),
    ("Дней", lambda x: x.dt.date.nunique())
]).reset_index()

usage["Запусков_в_день"] = (
    usage["Всего_запусков"] / usage["Дней"].replace(0, 1)
)

usage.columns = ["Ключ", "Всего_запусков", "Дней", "Запусков_в_день"]

df = df.merge(usage, on="Ключ", how="left")

# =========================
# 9. Параллельные сессии (СТАБИЛЬНО)
# =========================
mod_sorted = mod.sort_values(by=[mod_key, mod_date]).copy()

mod_sorted["diff_sec"] = (
    mod_sorted.groupby(mod_key)[mod_date]
    .diff()
    .dt.total_seconds()
)

mod_sorted["is_parallel"] = mod_sorted["diff_sec"] < 60

parallel = (
    mod_sorted
    .groupby(mod_key)["is_parallel"]
    .sum()
    .reset_index()
)

parallel.columns = ["Ключ", "Параллельные_сессии"]

df = df.merge(parallel, on="Ключ", how="left")

# защита от NaN
df["Параллельные_сессии"] = df["Параллельные_сессии"].fillna(0)

# =========================
# 10. Флаги
# =========================
df["Флаг_много_MAC"] = df["MAC"] > 3
df["Флаг_много_пользователей"] = df["Пользователи"] > 2
df["Флаг_много_IP"] = df["IP"] > 2
df["Флаг_частые_активации"] = df["Активации"] > 5
df["Флаг_нагрузка"] = df["Запусков_в_день"] > 10
df["Флаг_параллельность"] = df["Параллельные_сессии"] > 3

# =========================
# 11. Скоринг
# =========================
def score(row):
    s = 0
    if row["Флаг_много_MAC"]: s += 2
    if row["Флаг_много_пользователей"]: s += 2
    if row["Флаг_много_IP"]: s += 1
    if row["Флаг_частые_активации"]: s += 2
    if row["Флаг_нагрузка"]: s += 2
    if row["Флаг_параллельность"]: s += 3
    return s

df["Score"] = df.apply(score, axis=1)

# =========================
# 12. Причины
# =========================
def explain(row):
    reasons = []
    if row["Флаг_много_MAC"]:
        reasons.append("много устройств")
    if row["Флаг_много_пользователей"]:
        reasons.append("много пользователей")
    if row["Флаг_много_IP"]:
        reasons.append("разные IP")
    if row["Флаг_частые_активации"]:
        reasons.append("частые активации")
    if row["Флаг_нагрузка"]:
        reasons.append("высокая нагрузка")
    if row["Флаг_параллельность"]:
        reasons.append("параллельные сессии")
    return ", ".join(reasons)

df["Причины"] = df.apply(explain, axis=1)

# =========================
# 13. Риск
# =========================
df["Риск"] = df["Score"].apply(
    lambda x: "Высокий" if x >= 7 else "Средний" if x >= 4 else "Низкий"
)

# =========================
# 14. Сортировка
# =========================
df = df.sort_values(by="Score", ascending=False)

# =========================
# 15. Сохранение
# =========================
df.to_csv("Финальный_анализ_лицензий.csv", index=False, encoding="utf-8-sig")

print("🚀 Готово! Файл: Финальный_анализ_лицензий.csv")