using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace AutoServiceSystem
{
    public class Client
    {
        public int ClientId { get; set; }
        public string Name { get; set; }
        public string Phone { get; set; }
        public string Email { get; set; }
        public string CarModel { get; set; }

        public RepairRequest CreateRepairRequest(string problemDescription)
        {
            return new RepairRequest
            {
                Client = this,
                ProblemDescription = problemDescription,
                Status = "Создана"
            };
        }

        public void GetNotification(Notification notification)
        {
            Console.WriteLine($"Уведомление для {Name}: {notification.Message}");
        }

        public void ExtendService(RepairRequest request, Service additionalService)
        {
            request.Services.Add(additionalService);
            Console.WriteLine($"Услуга {additionalService.Name} добавлена к заявке №{request.RequestId}");
        }
    }
}