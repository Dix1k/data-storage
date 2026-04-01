using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Faculty
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            // TODO: данная строка кода позволяет загрузить данные в таблицу "facultyDataSet.semester". При необходимости она может быть перемещена или удалена.
            this.semesterTableAdapter.Fill(this.facultyDataSet.semester);
            // TODO: данная строка кода позволяет загрузить данные в таблицу "facultyDataSet.subject". При необходимости она может быть перемещена или удалена.
            this.subjectTableAdapter.Fill(this.facultyDataSet.subject);
            // TODO: данная строка кода позволяет загрузить данные в таблицу "facultyDataSet.student". При необходимости она может быть перемещена или удалена.
            this.studentTableAdapter.Fill(this.facultyDataSet.student);
            // TODO: данная строка кода позволяет загрузить данные в таблицу "facultyDataSet.edu_group". При необходимости она может быть перемещена или удалена.
            this.edu_groupTableAdapter.Fill(this.facultyDataSet.edu_group);
            // TODO: данная строка кода позволяет загрузить данные в таблицу "facultyDataSet.specialty". При необходимости она может быть перемещена или удалена.
            this.specialtyTableAdapter.Fill(this.facultyDataSet.specialty);
            // TODO: данная строка кода позволяет загрузить данные в таблицу "facultyDataSet.teacher". При необходимости она может быть перемещена или удалена.
            this.teacherTableAdapter.Fill(this.facultyDataSet.teacher);
            // TODO: данная строка кода позволяет загрузить данные в таблицу "facultyDataSet.department". При необходимости она может быть перемещена или удалена.
            this.departmentTableAdapter.Fill(this.facultyDataSet.department);
            // TODO: данная строка кода позволяет загрузить данные в таблицу "facultyDataSet.faculty". При необходимости она может быть перемещена или удалена.
            this.facultyTableAdapter.Fill(this.facultyDataSet.faculty);

        }

        private void button1_Click(object sender, EventArgs e)
        {
            try
            {
                // Сохраняем изменения для всех таблиц
                this.Validate();
                this.facultyBindingSource.EndEdit();
                this.facultyTableAdapter.Update(this.facultyDataSet.faculty);

                this.departmentBindingSource.EndEdit();
                this.departmentTableAdapter.Update(this.facultyDataSet.department);

                this.teacherBindingSource.EndEdit();
                this.teacherTableAdapter.Update(this.facultyDataSet.teacher);

                this.specialtyBindingSource.EndEdit();
                this.specialtyTableAdapter.Update(this.facultyDataSet.specialty);

                this.edugroupBindingSource.EndEdit();
                this.edu_groupTableAdapter.Update(this.facultyDataSet.edu_group);

                this.studentBindingSource.EndEdit();
                this.studentTableAdapter.Update(this.facultyDataSet.student);

                this.subjectBindingSource.EndEdit();
                this.subjectTableAdapter.Update(this.facultyDataSet.subject);

                this.semesterBindingSource.EndEdit();
                this.semesterTableAdapter.Update(this.facultyDataSet.semester);

                MessageBox.Show("Изменения успешно сохранены!");
            }
            catch (Exception ex)
            {
                MessageBox.Show("Ошибка при сохранении: " + ex.Message);
            }
        }
    }
}
