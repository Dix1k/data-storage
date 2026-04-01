using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace AutoServiceSystem
{
    public class Administrator
    {
        public int AdminId { get; set; }
        public string Name { get; set; }
        public string Position { get; set; }

        public void RegisterClient(Client client)
        {
            Console.WriteLine($"Клиент {client.Name} зарегистрирован администратором {Name}");
        }

        public void ScheduleRepair(RepairRequest request, Mechanic mechanic, DateTime repairDate)
        {
            request.AssignedMechanic = mechanic;
            request.RepairDate = repairDate;
            request.Status = "Назначена";
            Console.WriteLine($"Ремонт назначен на {repairDate.ToShortDateString()}, механик: {mechanic.Name}");
        }

        public void NotifyClient(Client client, string message)
        {
            var notification = new Notification
            {
                Message = message,
                Date = DateTime.Now
            };
            client.GetNotification(notification);
        }
    }
}