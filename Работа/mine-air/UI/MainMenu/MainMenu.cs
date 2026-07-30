using Godot;
using System;
using System.Collections.Generic;
using System.IO;
using MineAirMonitoring.Import.ERP;

namespace MineAirMonitoring.UI.MainMenu;

public partial class MainMenu : Control
{
	// UI элементы
	private Button _addModelButton = null!;
	private Button _openModelButton = null!;
	private Button _removeModelButton = null!;
	private Label _statusLabel = null!;
	private Label _modelInfoLabel = null!;
	private FileDialog _fileDialog = null!;
	private ItemList _modelList = null!;
	private Label _statusIcon = null!;
	
	// Данные
	private List<ModelEntry> _models = new List<ModelEntry>();
	private int _selectedModelIndex = -1;
	private string _modelsConfigPath = "user://models.cfg";

	// Таймер для скрытия статуса
	private Timer _statusTimer = null!;

	public override void _Ready()
	{
		try
		{
			// Получаем ссылки на UI элементы
			_addModelButton = GetNode<Button>("SafeArea/VBoxContainer/ActionPanel/ActionContainer/AddModelButton");
			_openModelButton = GetNode<Button>("SafeArea/VBoxContainer/ActionPanel/ActionContainer/ButtonRow/OpenModelButton");
			_removeModelButton = GetNode<Button>("SafeArea/VBoxContainer/ActionPanel/ActionContainer/ButtonRow/RemoveModelButton");
			_modelList = GetNode<ItemList>("SafeArea/VBoxContainer/ListPanel/ModelList");
			_statusLabel = GetNode<Label>("SafeArea/VBoxContainer/InfoPanel/InfoContainer/StatusContainer/StatusLabel");
			_statusIcon = GetNode<Label>("SafeArea/VBoxContainer/InfoPanel/InfoContainer/StatusContainer/StatusIcon");
			_modelInfoLabel = GetNode<Label>("SafeArea/VBoxContainer/InfoPanel/InfoContainer/ModelInfoLabel");
			_fileDialog = GetNode<FileDialog>("FileDialog");

			// Настройка таймера для скрытия статуса
			_statusTimer = new Timer();
			AddChild(_statusTimer);
			_statusTimer.OneShot = true;
			_statusTimer.Timeout += () => 
			{
				if (_selectedModelIndex >= 0 && _selectedModelIndex < _models.Count)
				{
					var model = _models[_selectedModelIndex];
					_statusLabel.Text = $"Выбрана: {model.Name}";
					_statusIcon.Text = "●";
					_statusIcon.Modulate = new Color(0.3f, 0.7f, 0.3f);
				}
				else
				{
					_statusLabel.Text = "Готов к работе";
					_statusIcon.Text = "●";
					_statusIcon.Modulate = new Color(0.3f, 0.7f, 0.3f);
				}
			};

			// Подписываемся на события
			_addModelButton.Pressed += OnAddModelPressed;
			_openModelButton.Pressed += OnOpenModelPressed;
			_removeModelButton.Pressed += OnRemoveModelPressed;
			_modelList.ItemSelected += OnModelSelected;
			_modelList.ItemActivated += OnModelActivated;
			_fileDialog.FileSelected += OnFileSelected;

			// Изначально кнопки неактивны
			_openModelButton.Disabled = true;
			_removeModelButton.Disabled = true;

			// Загружаем сохраненные модели
			LoadModels();
			UpdateModelList();
		}
		catch (Exception ex)
		{
			GD.PrintErr($"Ошибка инициализации: {ex.Message}");
			GD.PrintErr($"Stack trace: {ex.StackTrace}");
		}
	}

	private void SetStatus(string message, bool isError = false)
	{
		if (_statusLabel == null || _statusIcon == null)
			return;

		_statusLabel.Text = message;
		
		if (isError)
		{
			_statusIcon.Text = "✖";
			_statusIcon.Modulate = new Color(1f, 0.3f, 0.3f);
			_statusLabel.Modulate = new Color(1f, 0.3f, 0.3f);
		}
		else
		{
			_statusIcon.Text = "●";
			_statusIcon.Modulate = new Color(0.3f, 0.8f, 0.3f);
			_statusLabel.Modulate = new Color(0.4f, 0.8f, 0.4f);
		}
		
		// Сбрасываем таймер
		if (_statusTimer != null)
		{
			_statusTimer.Stop();
			_statusTimer.Start(3.0f);
		}
	}

	private void OnAddModelPressed()
	{
		if (_fileDialog == null)
			return;

		var screenSize = DisplayServer.ScreenGetSize();
		int width = (int)(screenSize.X * 0.92);
		int height = (int)(screenSize.Y * 0.85);
		_fileDialog.PopupCentered(new Vector2I(width, height));
	}

	private void OnFileSelected(string path)
	{
		try
		{
			if (_models.Exists(m => m.Path == path))
			{
				SetStatus("Эта модель уже загружена", true);
				return;
			}

			var reader = new ErpArchiveReader();
			reader.Load(path);

			var model = new ModelEntry
			{
				Name = Path.GetFileNameWithoutExtension(path),
				Path = path,
				ExtractFolder = reader.ExtractFolder,
				SchemaPath = reader.SchemaPath,
				LoadDate = DateTime.Now
			};

			_models.Add(model);
			
			UpdateModelList();
			SaveModels();
			
			int newIndex = _models.Count - 1;
			_modelList.Select(newIndex);
			OnModelSelected(newIndex);

			SetStatus($"✅ Модель '{model.Name}' загружена");
		}
		catch (Exception ex)
		{
			GD.PrintErr($"Ошибка загрузки: {ex.Message}");
			SetStatus($"❌ {ex.Message}", true);
		}
	}

	private void OnModelSelected(long index)
	{
		int idx = (int)index;
		if (idx >= 0 && idx < _models.Count)
		{
			_selectedModelIndex = idx;
			var model = _models[idx];
			
			// Обновляем информацию
			string info = $"📁 {model.Name}\n";
			info += $"📅 {model.LoadDate:dd.MM.yyyy HH:mm}";
			_modelInfoLabel.Text = info;
			
			_openModelButton.Disabled = false;
			_removeModelButton.Disabled = false;
			
			SetStatus($"Выбрана: {model.Name}");
		}
	}

	private void OnModelActivated(long index)
	{
		OnOpenModelPressed();
	}

	private void OnOpenModelPressed()
	{
		if (_selectedModelIndex < 0 || _selectedModelIndex >= _models.Count)
			return;

		var model = _models[_selectedModelIndex];
		
		try
		{
			// Проверяем существование файла
			if (!File.Exists(model.Path))
			{
				SetStatus($"❌ Файл модели не найден", true);
				return;
			}

			SetStatus($"🔄 Открытие '{model.Name}'...");
			OpenModel(model);
			SetStatus($"✅ Модель '{model.Name}' открыта");
		}
		catch (Exception ex)
		{
			GD.PrintErr($"Ошибка открытия: {ex.Message}");
			SetStatus($"❌ {ex.Message}", true);
		}
	}

	private void OnRemoveModelPressed()
	{
		if (_selectedModelIndex < 0 || _selectedModelIndex >= _models.Count)
			return;

		var model = _models[_selectedModelIndex];
		
		var confirmDialog = new ConfirmationDialog
		{
			Title = "Удаление модели",
			DialogText = $"Удалить '{model.Name}'?",
			OkButtonText = "Удалить",
			CancelButtonText = "Отмена"
		};
		AddChild(confirmDialog);
		confirmDialog.Confirmed += () => RemoveModel(model);
		confirmDialog.PopupCentered();
	}

	private void RemoveModel(ModelEntry model)
	{
		try
		{
			if (Directory.Exists(model.ExtractFolder))
			{
				Directory.Delete(model.ExtractFolder, true);
			}

			_models.Remove(model);
			_selectedModelIndex = -1;
			
			UpdateModelList();
			SaveModels();
			
			_modelInfoLabel.Text = "Модель не выбрана";
			_openModelButton.Disabled = true;
			_removeModelButton.Disabled = true;
			
			SetStatus($"🗑️ Модель удалена");
		}
		catch (Exception ex)
		{
			GD.PrintErr($"Ошибка удаления: {ex.Message}");
			SetStatus($"❌ {ex.Message}", true);
		}
	}

	private void OpenModel(ModelEntry model)
	{
		// Открываем модель
		GD.Print($"Открытие модели: {model.Name}");
		GD.Print($"Путь к схеме: {model.SchemaPath}");
		
		// Здесь бедет код для открытия схемы
	}

	private void UpdateModelList()
	{
		if (_modelList == null)
			return;
		
		_modelList.Clear();
		foreach (var model in _models)
		{
			string displayName = File.Exists(model.Path) ? model.Name : $"⚠️ {model.Name}";
			_modelList.AddItem(displayName);
			
			// Если файл отсутствует, делаем серым
			if (!File.Exists(model.Path))
			{
				_modelList.SetItemCustomBgColor(_modelList.ItemCount - 1, new Color(0.3f, 0.2f, 0.2f, 0.5f));
			}
		}
	}

	private void SaveModels()
	{
		try
		{
			var config = new ConfigFile();
			config.SetValue("General", "Count", _models.Count);
			
			for (int i = 0; i < _models.Count; i++)
			{
				var model = _models[i];
				string prefix = $"Model_{i}";
				config.SetValue(prefix, "Name", model.Name);
				config.SetValue(prefix, "Path", model.Path);
				config.SetValue(prefix, "ExtractFolder", model.ExtractFolder);
				config.SetValue(prefix, "SchemaPath", model.SchemaPath);
				config.SetValue(prefix, "LoadDate", model.LoadDate.ToString("yyyy-MM-dd HH:mm:ss"));
			}
			
			config.Save(_modelsConfigPath);
		}
		catch (Exception ex)
		{
			GD.PrintErr($"Ошибка сохранения: {ex.Message}");
		}
	}

	private void LoadModels()
	{
		try
		{
			string globalPath = ProjectSettings.GlobalizePath(_modelsConfigPath);
			if (!File.Exists(globalPath))
			{
				return;
			}

			var config = new ConfigFile();
			if (config.Load(_modelsConfigPath) != Error.Ok)
			{
				return;
			}

			int count = (int)config.GetValue("General", "Count", 0);
			
			for (int i = 0; i < count; i++)
			{
				string prefix = $"Model_{i}";
				
				var model = new ModelEntry
				{
					Name = (string)config.GetValue(prefix, "Name", $"Модель {i+1}"),
					Path = (string)config.GetValue(prefix, "Path", ""),
					ExtractFolder = (string)config.GetValue(prefix, "ExtractFolder", ""),
					SchemaPath = (string)config.GetValue(prefix, "SchemaPath", ""),
				};
				
				string dateStr = (string)config.GetValue(prefix, "LoadDate", "");
				if (DateTime.TryParse(dateStr, out DateTime date))
				{
					model.LoadDate = date;
				}
				
				_models.Add(model);
			}
			
			UpdateModelList();
		}
		catch (Exception ex)
		{
			GD.PrintErr($"Ошибка загрузки: {ex.Message}");
		}
	}

	private class ModelEntry
	{
		public string Name { get; set; } = string.Empty;
		public string Path { get; set; } = string.Empty;
		public string ExtractFolder { get; set; } = string.Empty;
		public string SchemaPath { get; set; } = string.Empty;
		public DateTime LoadDate { get; set; } = DateTime.Now;
	}
}
