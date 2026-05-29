const content = document.getElementById("content");

function closeModal() {
    document.getElementById("modal").classList.add("hidden");
}

function openModal(html) {
    document.getElementById("modal-content").innerHTML = html;
    document.getElementById("modal").classList.remove("hidden");
}

async function showPage(page) {

    if (page === "dashboard") {

        content.innerHTML = `
            <h2>Панель управления</h2>
            <canvas id="chart"></canvas>
        `;

        new Chart(
            document.getElementById("chart"),
            {
                type:"pie",
                data:{
                    labels:["Одобрено","Проверка","Отказано"],
                    datasets:[{
                        data:[10,4,2]
                    }]
                }
            }
        );
    }

    if (page === "clients") {

        const res = await fetch("/api/clients");
        const clients = await res.json();

        content.innerHTML = `
            <h2>Клиенты</h2>

            <button class="add-btn" onclick="showClientModal()">
                Добавить клиента
            </button>

            <table>
                <tr>
                    <th>ФИО</th>
                    <th>Телефон</th>
                    <th>Email</th>
                </tr>

                ${
                    clients.map(c=>`
                        <tr>
                            <td>${c.lastName} ${c.firstName}</td>
                            <td>${c.phone}</td>
                            <td>${c.email}</td>
                        </tr>
                    `).join("")
                }
            </table>
        `;
    }

    if (page === "applications") {

        const res = await fetch("/api/applications");
        const apps = await res.json();

        content.innerHTML = `
            <h2>Заявки</h2>

            <div style="margin-bottom:15px">
                <input placeholder="Поиск клиента">
                <select>
                    <option>Все статусы</option>
                    <option>Черновик</option>
                    <option>На проверке</option>
                    <option>Одобрено</option>
                    <option>Отказано</option>
                </select>
            </div>

            <button class="add-btn" onclick="showApplicationModal()">
                Новая заявка
            </button>

            <table>
                <tr>
                    <th>Клиент</th>
                    <th>Тип кредита</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                </tr>

                ${
                    apps.map(a=>`
                        <tr>
                            <td>${a.client}</td>
                            <td>${a.creditType}</td>
                            <td>${a.amount}</td>
                            <td>${a.status}</td>
                        </tr>
                    `).join("")
                }
            </table>
        `;
    }

    if (page === "contracts") {

        content.innerHTML = `
            <h2>Договоры</h2>

            <table>
                <tr>
                    <th>№ договора</th>
                    <th>Клиент</th>
                    <th>Сумма</th>
                    <th>Действия</th>
                </tr>

                <tr>
                    <td>KR-001</td>
                    <td>Иванов И.И.</td>
                    <td>500000</td>

                    <td>
                        <button onclick="showContract()">
                            Открыть
                        </button>

                        <button onclick="showPayments()">
                            График платежей
                        </button>
                    </td>
                </tr>
            </table>
        `;
    }

    if (page === "reports") {

        content.innerHTML = `
            <h2>Отчёты</h2>

            <div style="margin-bottom:20px">
                <input type="date">
                <input type="date">
            </div>

            <canvas id="reportChart"></canvas>
        `;

        new Chart(
            document.getElementById("reportChart"),
            {
                type:"bar",
                data:{
                    labels:["Янв","Фев","Мар","Апр"],
                    datasets:[{
                        data:[3,5,2,6]
                    }]
                }
            }
        );
    }
}

function showClientModal() {

    openModal(`
        <h2>Новый клиент</h2>

        <div class="form-grid">

            <input placeholder="Фамилия">
            <input placeholder="Имя">
            <input placeholder="Отчество">

            <input type="date">
            <input placeholder="Паспорт">
            <input placeholder="ИНН">

            <input placeholder="Телефон">
            <input placeholder="Email">

        </div>

        <div class="modal-actions">
            <button class="save">Сохранить</button>
            <button class="cancel" onclick="closeModal()">Отмена</button>
        </div>
    `);
}

function showApplicationModal() {

    openModal(`
        <h2>Новая заявка</h2>

        <div class="form-grid">

            <select>
                <option>Клиент</option>
            </select>

            <select>
                <option>Потребительский</option>
                <option>Автокредит</option>
                <option>Ипотека</option>
            </select>

            <select>
                <option>Петров</option>
                <option>Сидоров</option>
            </select>

            <input placeholder="Сумма">

            <input placeholder="Срок">

            <select>
                <option>Черновик</option>
                <option>На проверке</option>
                <option>Одобрено</option>
                <option>Отказано</option>
            </select>

        </div>

        <textarea placeholder="Комментарий"></textarea>

        <div class="modal-actions">
            <button class="save">Сохранить</button>
            <button class="cancel" onclick="closeModal()">Отмена</button>
        </div>
    `);
}

function showContract() {

    openModal(`
        <h2>Кредитный договор KR-001</h2>

        <p>Клиент: Иванов И.И.</p>
        <p>Сумма: 500000</p>
        <p>Срок: 36 месяцев</p>
        <p>Статус: активен</p>

        <div class="modal-actions">
            <button class="cancel" onclick="closeModal()">Закрыть</button>
        </div>
    `);
}

function showPayments() {

    openModal(`
        <h2>График платежей</h2>

        <table>

            <tr>
                <th>Месяц</th>
                <th>Платёж</th>
            </tr>

            <tr>
                <td>Январь</td>
                <td>15000</td>
            </tr>

            <tr>
                <td>Февраль</td>
                <td>15000</td>
            </tr>

        </table>

        <div class="modal-actions">
            <button class="cancel" onclick="closeModal()">Закрыть</button>
        </div>
    `);
}

showPage("dashboard");