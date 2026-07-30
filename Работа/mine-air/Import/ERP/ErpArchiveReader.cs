using Godot;
using System;
using System.IO;
using System.IO.Compression;

namespace MineAirMonitoring.Import.ERP;

public partial class ErpArchiveReader : Node
{
	public string ExtractFolder { get; private set; } = string.Empty;
	public string SchemaPath { get; private set; } = string.Empty;

	public bool Load(string erpFile)
	{
		if (!File.Exists(erpFile)) 
			throw new FileNotFoundException($"ERP файл не найден: {erpFile}", erpFile);

		try
		{
			ExtractFolder = Path.Combine(
				Path.GetTempPath(),
				"MineAir",
				Guid.NewGuid().ToString());
			
			Directory.CreateDirectory(ExtractFolder);

			ZipFile.ExtractToDirectory(erpFile, ExtractFolder, true);
			GD.Print($"Архив распакован в: {ExtractFolder}");

			string[] schemas = Directory.GetFiles(
				ExtractFolder,
				"schema.xml",
				SearchOption.AllDirectories);

			if (schemas.Length == 0)
			{
				throw new Exception("Файл схемы schema.xml не найден в архиве");
			}

			SchemaPath = schemas[0];
			GD.Print($"Найден файл схемы: {SchemaPath}");
			
			return true;
		}
		catch
		{
			Cleanup();
			throw;
		}
	}

	public void Cleanup()
	{
		if (Directory.Exists(ExtractFolder))
		{
			try
			{
				Directory.Delete(ExtractFolder, true);
				GD.Print($"Временная папка очищена: {ExtractFolder}");
			}
			catch (Exception ex)
			{
				GD.PrintErr($"Ошибка очистки: {ex.Message}");
			}
		}

		ExtractFolder = string.Empty;
		SchemaPath = string.Empty;
	}
}
