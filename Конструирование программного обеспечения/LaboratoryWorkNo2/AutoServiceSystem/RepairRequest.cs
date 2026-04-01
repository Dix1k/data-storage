using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace AutoServiceSystem
{
    public class RepairRequest
    {
        public int RequestId { get; set; }
        public DateTime Date { get; set; } = DateTime.Now;
        public string ProblemDescription { get; set; }
        public string Status { get; set; }
        public DateTime? RepairDate { get; set; }
        public Client Client { get; set; }
        public Mechanic AssignedMechanic { get; set; }
        public List<Service> Services { get; set; } = new List<Service>();

        public void UpdateStatus(string newStatus)
        {
            Status = newStatus;
            Console.WriteLine($"Статус заявки №{RequestId} изменен на: {newStatus}");
        }

        public decimal CalculateEstimate()
        {
            decimal total = 0;
            foreach (var service in Services)
            {
                total += service.Price;
            }
            return total;
        }
    }
}