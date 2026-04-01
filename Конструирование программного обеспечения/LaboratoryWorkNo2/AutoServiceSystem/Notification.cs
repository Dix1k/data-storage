using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace AutoServiceSystem
{
    public class Notification
    {
        public int NotificationId { get; set; }
        public string Message { get; set; }
        public DateTime Date { get; set; }
        public string Status { get; set; } = "Не прочитано";

        public void Send(Client client)
        {
            client.GetNotification(this);
            Status = "Отправлено";
        }

        public void MarkAsRead()
        {
            Status = "Прочитано";
        }
    }
}