using AutoServiceSystem;

class Program
{
    static void Main(string[] args)
    {
        // Создание объектов
        var client = new Client
        {
            ClientId = 1,
            Name = "Иванов Иван",
            Phone = "+79001234567",
            CarModel = "Toyota Camry"
        };

        var admin = new Administrator
        {
            AdminId = 1,
            Name = "Петрова Анна",
            Position = "Старший администратор"
        };

        var mechanic = new Mechanic
        {
            MechanicId = 1,
            Name = "Сидоров Василий",
            Specialization = "Двигатели",
            Experience = 5
        };

        var diagnosticService = new Service
        {
            ServiceId = 1,
            Name = "Диагностика двигателя",
            Description = "Полная диагностика двигателя",
            Price = 2000
        };

        var sparkPlugService = new Service
        {
            ServiceId = 2,
            Name = "Замена свечей зажигания",
            Description = "Замена комплекта свечей зажигания",
            Price = 3500
        };

        // Работа с системой
        admin.RegisterClient(client);
        var request = client.CreateRepairRequest("Двигатель работает неровно");
        diagnosticService.AddToRequest(request);
        admin.ScheduleRepair(request, mechanic, DateTime.Now.AddDays(1));

        var diagnosticsResult = mechanic.PerformDiagnostics(request);
        mechanic.ClarifyDetails(request, "Необходима замена свечей");

        client.ExtendService(request, sparkPlugService);
        mechanic.PerformRepair(request);

        admin.NotifyClient(client, "Ваш автомобиль готов к выдаче");
        Console.WriteLine($"Общая стоимость ремонта: {request.CalculateEstimate()} руб.");
    }
}