using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace AutoServiceSystem
{
    public class Mechanic
    {
        public int MechanicId { get; set; }
        public string Name { get; set; }
        public string Specialization { get; set; }
        public int Experience { get; set; }

        public string PerformDiagnostics(RepairRequest request)
        {
            request.Status = "Диагностика";
            Console.WriteLine($"Механик {Name} проводит диагностику для заявки №{request.RequestId}");
            return "Результаты диагностики";
        }

        public void PerformRepair(RepairRequest request)
        {
            request.Status = "В работе";
            Console.WriteLine($"Механик {Name} выполняет ремонт по заявке №{request.RequestId}");
            // Логика выполнения ремонта
            request.Status = "Завершена";
        }

        public void ClarifyDetails(RepairRequest request, string details)
        {
            request.ProblemDescription += $"\nУточнение: {details}";
            Console.WriteLine($"Механик {Name} уточнил детали по заявке №{request.RequestId}");
        }
    }
}