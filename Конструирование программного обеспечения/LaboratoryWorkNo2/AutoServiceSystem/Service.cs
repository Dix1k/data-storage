using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace AutoServiceSystem
{
    public class Service
    {
        public int ServiceId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }

        public void AddToRequest(RepairRequest request)
        {
            request.Services.Add(this);
            Console.WriteLine($"Услуга {Name} добавлена к заявке №{request.RequestId}");
        }

        public TimeSpan CalculateDuration()
        {
            // Простая логика расчета длительности на основе типа услуги
            if (Name.Contains("Диагностика")) return TimeSpan.FromHours(1);
            if (Name.Contains("Замена")) return TimeSpan.FromHours(2);
            return TimeSpan.FromHours(0.5);
        }
    }
}