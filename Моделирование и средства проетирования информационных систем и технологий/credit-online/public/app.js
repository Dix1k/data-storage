const content = document.getElementById("content");
let currentChart = null;

function closeModal() {
    document.getElementById("modal").classList.add("hidden");
}

function openModal(html) {
    document.getElementById("modal-content").innerHTML = html;
    document.getElementById("modal").classList.remove("hidden");
}

async function loadData(url) {
    const res = await fetch(url);
    return res.json();
}

function showNotification(message, isError = false) {
    const notification = document.createElement("div");
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        background: ${isError ? '#ef4444' : '#16a34a'};
        color: white;
        border-radius: 8px;
        z-index: 1000;
        animation: fadeOut 3s ease forwards;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

async function showPage(page) {
    if (page === "dashboard") {
        const stats = await loadData("/api/dashboard-stats");
        const chartData = await loadData("/api/chart-data");
        
        content.innerHTML = `
            <h2>Панель управления</h2>
            
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h3 style="color: #6b7280; margin: 0 0 10px 0;">Активных заявок</h3>
                    <p style="font-size: 32px; font-weight: bold; margin: 0;">${stats.activeApplications || 0}</p>
                </div>
                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h3 style="color: #6b7280; margin: 0 0 10px 0;">Выданных кредитов</h3>
                    <p style="font-size: 32px; font-weight: bold; margin: 0;">${stats.issuedCredits || 0}</p>
                </div>
                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h3 style="color: #6b7280; margin: 0 0 10px 0;">Одобрено</h3>
                    <p style="font-size: 32px; font-weight: bold; margin: 0; color: #16a34a;">${stats.approvedApplications || 0}</p>
                </div>
                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h3 style="color: #6b7280; margin: 0 0 10px 0;">Отказано</h3>
                    <p style="font-size: 32px; font-weight: bold; margin: 0; color: #ef4444;">${stats.rejectedApplications || 0}</p>
                </div>
            </div>
            
            <canvas id="dashboardChart" style="max-height: 300px;"></canvas>
        `;
        
        const ctx = document.getElementById("dashboardChart");
        if (ctx) {
            if (currentChart) currentChart.destroy();
            currentChart = new Chart(ctx, {
                type: "pie",
                data: {
                    labels: chartData.map(d => d.name),
                    datasets: [{
                        data: chartData.map(d => d.count),
                        backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec489a', '#06b6d4']
                    }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
            });
        }
    }

    if (page === "clients") {
        const clients = await loadData("/api/clients");
        content.innerHTML = `
            <h2>Клиенты</h2>
            <button class="add-btn" onclick="showClientModal()">+ Добавить клиента</button>
            
            <div style="overflow-x: auto;">
                <table>
                    <thead><tr><th>ФИО</th><th>Дата рождения</th><th>Паспорт</th><th>ИНН</th><th>Телефон</th><th>Email</th><th>Действия</th></tr></thead>
                    <tbody>
                        ${clients.map(c => `
                            <tr>
                                <td>${c.lastName} ${c.firstName} ${c.middleName || ''}</td>
                                <td>${c.birthDate}</td>
                                <td>${c.passportSeries || ''} ${c.passportNumber || ''}</td>
                                <td>${c.inn || '-'}</td>
                                <td>${c.phone}</td>
                                <td>${c.email || '-'}</td>
                                <td><button onclick="deleteClient(${c.id})" style="background:#ef4444;color:white;border:none;padding:4px 8px;">Удалить</button></td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    if (page === "applications") {
        const apps = await loadData("/api/applications");
        const clients = await loadData("/api/clients");
        const creditTypes = await loadData("/api/credit-types");
        const employees = await loadData("/api/employees");
        
        const statusMap = {
            '01': { name: 'Черновик', color: '#9ca3af' },
            '02': { name: 'На проверке', color: '#f59e0b' },
            '03': { name: 'Одобрена', color: '#10b981' },
            '04': { name: 'Отказана', color: '#ef4444' },
            '05': { name: 'Договор сформирован', color: '#3b82f6' },
            '06': { name: 'Договор подписан', color: '#8b5cf6' },
            '07': { name: 'Кредит выдан', color: '#059669' },
            '08': { name: 'Закрыта', color: '#6b7280' },
            '09': { name: 'Отменена', color: '#ef4444' }
        };
        
        content.innerHTML = `
            <h2>Заявки на кредит</h2>
            <button class="add-btn" onclick="showApplicationModal()">+ Новая заявка</button>
            
            <div style="overflow-x: auto;">
                <table>
                    <thead><tr><th>№ заявки</th><th>Клиент</th><th>Тип кредита</th><th>Сумма (₽)</th><th>Срок (мес)</th><th>Статус</th><th>Дата</th><th>Действия</th></tr></thead>
                    <tbody>
                        ${apps.map(a => `
                            <tr>
                                <td>${a.applicationNumber}</td>
                                <td>${a.clientName || a.clientId}</td>
                                <td>${a.creditTypeName || a.creditTypeId}</td>
                                <td>${a.requestedAmount?.toLocaleString() || '-'}</td>
                                <td>${a.termMonths || '-'}</td>
                                <td><span style="background:${statusMap[a.statusCode]?.color || '#9ca3af'};color:white;padding:4px 12px;border-radius:20px;font-size:12px;">${statusMap[a.statusCode]?.name || a.statusCode}</span></td>
                                <td>${a.applicationDate}</td>
                                <td><button onclick="editApplication(${a.id})" style="background:#3b82f6;color:white;border:none;padding:4px 12px;">Редактировать</button></td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

if (page === "contracts") {
    const contracts = await loadData("/api/contracts");
    const applications = await loadData("/api/applications");
    const approvedApps = applications.filter(a => a.statusCode === '03'); // Одобренные заявки без договора
    
    content.innerHTML = `
        <h2>Кредитные договоры</h2>
        
        ${approvedApps.length > 0 ? `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <strong>📝 Доступно для оформления договора:</strong>
                <ul style="margin: 10px 0 0 20px;">
                    ${approvedApps.map(app => `
                        <li>
                            Заявка №${app.applicationNumber} - ${app.clientName} - ${app.requestedAmount?.toLocaleString()} ₽
                            <button onclick="createContractFromApplication(${app.id})" style="margin-left: 10px; background:#3b82f6; color:white; border:none; padding:4px 12px; border-radius:6px; cursor:pointer;">Оформить договор</button>
                        </li>
                    `).join("")}
                </ul>
            </div>
        ` : ''}
        
        <div style="overflow-x: auto;">
            <table>
                <thead>
                    <tr>
                        <th>№ договора</th>
                        <th>Клиент</th>
                        <th>№ заявки</th>
                        <th>Сумма (₽)</th>
                        <th>Ставка (%)</th>
                        <th>Срок (мес)</th>
                        <th>Дата подписания</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    ${contracts.map(c => {
                        const statusMap = {
                            'active': { name: 'Активен', color: '#10b981' },
                            'signed': { name: 'Подписан', color: '#3b82f6' },
                            'completed': { name: 'Закрыт', color: '#6b7280' }
                        };
                        const status = statusMap[c.status] || statusMap['active'];
                        return `
                            <tr>
                                <td>${c.contractNumber}</td>
                                <td>${c.clientName}</td>
                                <td>${c.applicationNumber}</td>
                                <td>${c.approvedAmount?.toLocaleString()}</td>
                                <td>${c.finalRate}%</td>
                                <td>${c.loanTermMonths}</td>
                                <td>${c.signDate}</td>
                                <td><span style="background:${status.color};color:white;padding:4px 12px;border-radius:20px;font-size:12px;">${status.name}</span></td>
                                <td>
                                    <button onclick="showContractModal(${c.id})" style="background:#3b82f6;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">📄 Договор</button>
                                    <button onclick="showPaymentsModal(${c.id})" style="background:#10b981;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">📅 График</button>
                                    ${c.status === 'active' ? `<button onclick="signContract(${c.id}, ${c.applicationId})" style="background:#8b5cf6;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">✍️ Подписать</button>` : ''}
                                    ${c.status === 'signed' ? `<button onclick="disburseLoan(${c.id}, ${c.applicationId})" style="background:#16a34a;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;">💰 Выдать кредит</button>` : ''}
                                </td>
                            </tr>
                        `;
                    }).join("")}
                    ${contracts.length === 0 ? '<tr><td colspan="9" style="text-align:center;">Нет оформленных договоров</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `;
}

    if (page === "reports") {
        const today = new Date().toISOString().split('T')[0];
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthStr = lastMonth.toISOString().split('T')[0];
        
        content.innerHTML = `
            <h2>Отчёт по выданным кредитам</h2>
            
            <div style="display: flex; gap: 15px; margin-bottom: 25px; flex-wrap: wrap;">
                <div>
                    <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">Дата начала</label>
                    <input type="date" id="reportStart" value="${lastMonthStr}" style="padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                </div>
                <div>
                    <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">Дата окончания</label>
                    <input type="date" id="reportEnd" value="${today}" style="padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
                </div>
                <div style="display: flex; align-items: end;">
                    <button id="generateReportBtn" style="background:#3b82f6; color:white; border:none; padding:8px 20px; border-radius:6px; cursor:pointer;">📊 Сформировать отчёт</button>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">💰 Общая сумма</h3>
                    <p id="totalAmount" style="font-size: 24px; font-weight: bold; margin: 0; color: #1f2937;">0 ₽</p>
                </div>
                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">📋 Количество</h3>
                    <p id="totalCount" style="font-size: 24px; font-weight: bold; margin: 0; color: #1f2937;">0</p>
                </div>
                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">📊 Средняя сумма</h3>
                    <p id="avgAmount" style="font-size: 24px; font-weight: bold; margin: 0; color: #1f2937;">0 ₽</p>
                </div>
                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">📈 Средняя ставка</h3>
                    <p id="avgRate" style="font-size: 24px; font-weight: bold; margin: 0; color: #1f2937;">0%</p>
                </div>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 15px 0;">Распределение по типам кредитов</h3>
                <canvas id="reportChart" style="max-height: 300px;"></canvas>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 12px;">
                <h3 style="margin: 0 0 15px 0;">Детальная таблица</h3>
                <div id="reportTable"></div>
            </div>
        `;
        
        // Функция загрузки отчёта
        async function loadReport() {
            const startDate = document.getElementById("reportStart")?.value || lastMonthStr;
            const endDate = document.getElementById("reportEnd")?.value || today;
            
            console.log(`Загрузка отчёта за период: ${startDate} - ${endDate}`);
            
            try {
                const response = await fetch(`/api/reports/issued-credits?startDate=${startDate}&endDate=${endDate}`);
                if (!response.ok) throw new Error("Ошибка загрузки отчёта");
                const report = await response.json();
                
                console.log("Получены данные:", report);
                
                // Обновляем карточки
                document.getElementById("totalAmount").innerHTML = (report.summary?.totalAmount || 0).toLocaleString() + ' ₽';
                document.getElementById("totalCount").innerHTML = report.summary?.count || 0;
                document.getElementById("avgAmount").innerHTML = Math.round(report.summary?.averageAmount || 0).toLocaleString() + ' ₽';
                document.getElementById("avgRate").innerHTML = (report.summary?.averageRate || 0) + '%';
                
                // Обновляем таблицу
                const tableBody = report.credits && report.credits.length > 0 
                    ? report.credits.map(c => `
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${c.contractNumber || '-'}</td>
                            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${c.clientName || '-'}</td>
                            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${c.creditTypeName || '-'}</td>
                            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(c.approvedAmount || 0).toLocaleString()}</td>
                            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${c.finalRate || 0}%</td>
                            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${c.signDate || '-'}</td>
                        </tr>
                    `).join("")
                    : '<tr><td colspan="6" style="padding: 40px; text-align: center; color: #6b7280;">📭 Нет выданных кредитов за выбранный период</td></tr>';
                
                document.getElementById("reportTable").innerHTML = `
                    <table style="width:100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8fafc;">
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">№ договора</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Клиент</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Тип кредита</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Сумма (₽)</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Ставка</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Дата выдачи</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableBody}
                        </tbody>
                    </table>
                `;
                
                // Обновляем диаграмму
                const typeStats = {};
                if (report.credits && report.credits.length > 0) {
                    report.credits.forEach(c => {
                        const typeName = c.creditTypeName || 'Другой';
                        typeStats[typeName] = (typeStats[typeName] || 0) + 1;
                    });
                }
                
                const chartCtx = document.getElementById("reportChart");
                if (chartCtx) {
                    if (window.reportChart) window.reportChart.destroy();
                    window.reportChart = new Chart(chartCtx, {
                        type: "pie",
                        data: {
                            labels: Object.keys(typeStats).length > 0 ? Object.keys(typeStats) : ['Нет данных'],
                            datasets: [{
                                data: Object.keys(typeStats).length > 0 ? Object.values(typeStats) : [1],
                                backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec489a', '#06b6d4']
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: { position: 'bottom' },
                                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} договоров` } }
                            }
                        }
                    });
                }
                
            } catch (error) {
                console.error("Ошибка загрузки отчёта:", error);
                document.getElementById("reportTable").innerHTML = '<p style="color: red;">Ошибка загрузки отчёта. Проверьте соединение с сервером.</p>';
            }
        }
        
        // Назначаем обработчик на кнопку
        const generateBtn = document.getElementById("generateReportBtn");
        if (generateBtn) {
            generateBtn.addEventListener("click", loadReport);
        }
        
        // Загружаем отчёт при открытии страницы
        await loadReport();
    }
}

async function showClientModal(editId = null) {
    let client = null;
    if (editId) {
        const clients = await loadData("/api/clients");
        client = clients.find(c => c.id === editId);
    }
    
    openModal(`
        <h2>${editId ? 'Редактировать клиента' : 'Новый клиент'}</h2>
        <div class="form-grid">
            <input id="lastName" placeholder="Фамилия*" value="${client?.lastName || ''}">
            <input id="firstName" placeholder="Имя*" value="${client?.firstName || ''}">
            <input id="middleName" placeholder="Отчество" value="${client?.middleName || ''}">
            <input id="birthDate" type="date" value="${client?.birthDate || ''}">
            <input id="passportSeries" placeholder="Серия паспорта" value="${client?.passportSeries || ''}">
            <input id="passportNumber" placeholder="Номер паспорта" value="${client?.passportNumber || ''}">
            <input id="inn" placeholder="ИНН" value="${client?.inn || ''}">
            <input id="phone" placeholder="Телефон*" value="${client?.phone || ''}">
            <input id="email" placeholder="Email" value="${client?.email || ''}">
        </div>
        <div class="modal-actions">
            <button class="save" onclick="saveClient(${editId || 'null'})">Сохранить</button>
            <button class="cancel" onclick="closeModal()">Отмена</button>
        </div>
    `);
}

async function saveClient(editId) {
    const data = {
        lastName: document.getElementById("lastName")?.value,
        firstName: document.getElementById("firstName")?.value,
        middleName: document.getElementById("middleName")?.value,
        birthDate: document.getElementById("birthDate")?.value,
        passportSeries: document.getElementById("passportSeries")?.value,
        passportNumber: document.getElementById("passportNumber")?.value,
        inn: document.getElementById("inn")?.value,
        phone: document.getElementById("phone")?.value,
        email: document.getElementById("email")?.value
    };
    
    const url = editId ? `/api/clients/${editId}` : "/api/clients";
    const method = editId ? "PUT" : "POST";
    
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) {
        closeModal();
        showPage("clients");
        showNotification(editId ? "Клиент обновлён" : "Клиент добавлен");
    }
}

async function deleteClient(id) {
    if (confirm("Удалить клиента?")) {
        await fetch(`/api/clients/${id}`, { method: "DELETE" });
        showPage("clients");
        showNotification("Клиент удалён");
    }
}

async function showApplicationModal(editId = null) {
    const clients = await loadData("/api/clients");
    const creditTypes = await loadData("/api/credit-types");
    const employees = await loadData("/api/employees");
    let app = null;
    if (editId) {
        const apps = await loadData("/api/applications");
        app = apps.find(a => a.id === editId);
    }
    
    openModal(`
        <h2>${editId ? 'Редактировать заявку' : 'Новая заявка'}</h2>
        <div class="form-grid">
            <select id="clientId">
                <option value="">Выберите клиента*</option>
                ${clients.map(c => `<option value="${c.id}" ${app?.clientId == c.id ? 'selected' : ''}>${c.lastName} ${c.firstName}</option>`).join("")}
            </select>
            <select id="creditTypeId">
                <option value="">Тип кредита*</option>
                ${creditTypes.map(ct => `<option value="${ct.id}" ${app?.creditTypeId == ct.id ? 'selected' : ''}>${ct.name}</option>`).join("")}
            </select>
            <select id="employeeId">
                <option value="">Кредитный специалист*</option>
                ${employees.filter(e => e.position === 'Кредитный специалист').map(e => `<option value="${e.id}" ${app?.employeeId == e.id ? 'selected' : ''}>${e.lastName} ${e.firstName}</option>`).join("")}
            </select>
            <input id="requestedAmount" type="number" placeholder="Сумма (₽)*" value="${app?.requestedAmount || ''}">
            <input id="termMonths" type="number" placeholder="Срок (месяцев)*" value="${app?.termMonths || ''}">
            <select id="statusCode">
                <option value="01" ${app?.statusCode == '01' ? 'selected' : ''}>Черновик</option>
                <option value="02" ${app?.statusCode == '02' ? 'selected' : ''}>На проверке</option>
                <option value="03" ${app?.statusCode == '03' ? 'selected' : ''}>Одобрена</option>
                <option value="04" ${app?.statusCode == '04' ? 'selected' : ''}>Отказана</option>
            </select>
        </div>
        <textarea id="decisionComment" placeholder="Комментарий" style="width:100%;margin-top:15px;">${app?.decisionComment || ''}</textarea>
        <div class="modal-actions">
            <button class="save" onclick="saveApplication(${editId || 'null'})">Сохранить</button>
            <button class="cancel" onclick="closeModal()">Отмена</button>
        </div>
    `);
}

async function saveApplication(editId) {
    const data = {
        clientId: document.getElementById("clientId")?.value,
        creditTypeId: document.getElementById("creditTypeId")?.value,
        employeeId: document.getElementById("employeeId")?.value,
        requestedAmount: document.getElementById("requestedAmount")?.value,
        termMonths: document.getElementById("termMonths")?.value,
        statusCode: document.getElementById("statusCode")?.value,
        decisionComment: document.getElementById("decisionComment")?.value
    };
    
    const url = editId ? `/api/applications/${editId}` : "/api/applications";
    const method = editId ? "PUT" : "POST";
    
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) {
        closeModal();
        showPage("applications");
        showNotification(editId ? "Заявка обновлена" : "Заявка создана");
    }
}

async function editApplication(id) {
    showApplicationModal(id);
}

async function showContractModal(contractId) {
    const contracts = await loadData("/api/contracts");
    const contract = contracts.find(c => c.id === contractId);
    
    openModal(`
        <h2>Кредитный договор № ${contract?.contractNumber}</h2>
        <div style="border:1px solid #ddd; padding:20px; margin:15px 0;">
            <h3>Раздел 1. Стороны договора</h3>
            <p><strong>Заёмщик:</strong> ${contract?.clientName}</p>
            <p><strong>Банк:</strong> Пермский ГАТУ Банк, ИНН 1234567890, КПП 123456001</p>
            
            <h3>Раздел 2. Предмет договора</h3>
            <p><strong>Сумма кредита:</strong> ${contract?.approvedAmount?.toLocaleString()} ₽</p>
            <p><strong>Процентная ставка:</strong> ${contract?.finalRate}% годовых</p>
            <p><strong>Срок кредита:</strong> ${contract?.loanTermMonths} месяцев</p>
            
            <h3>Раздел 3. Порядок погашения</h3>
            <p>Погашение кредита производится ежемесячными аннуитетными платежами согласно графику платежей.</p>
            
            <h3>Раздел 4. Подписи сторон</h3>
            <p>__________________ (Банк)</p>
            <p>__________________ (Заёмщик)</p>
        </div>
        <div class="modal-actions">
            <button class="save" onclick="window.print()">Печать</button>
            <button class="cancel" onclick="closeModal()">Закрыть</button>
        </div>
    `);
}

async function showPaymentsModal(contractId) {
    const payments = await loadData(`/api/payment-schedules/${contractId}`);
    const contracts = await loadData("/api/contracts");
    const contract = contracts.find(c => c.id === contractId);
    
    openModal(`
        <h2>График платежей к договору № ${contract?.contractNumber}</h2>
        <table style="width:100%; border-collapse:collapse;">
            <thead>
                <tr style="background:#f3f4f6;"><th>№</th><th>Дата</th><th>ОД (₽)</th><th>Проценты (₽)</th><th>Платёж (₽)</th><th>Остаток (₽)</th></tr>
            </thead>
            <tbody>
                ${payments.map(p => `
                    <tr><td>${p.paymentNumber}</td><td>${p.paymentDate}</td><td>${p.principalAmount?.toLocaleString()}</td><td>${p.interestAmount?.toLocaleString()}</td><td>${p.totalPayment?.toLocaleString()}</td><td>${p.remainingDebt?.toLocaleString()}</td></tr>
                `).join("")}
                ${payments.length === 0 ? '<tr><td colspan="6" style="text-align:center;">График платежей не сформирован</td></tr>' : ''}
            </tbody>
        </table>
        <div class="modal-actions">
            <button class="save" onclick="window.print()">Печать</button>
            <button class="cancel" onclick="closeModal()">Закрыть</button>
        </div>
    `);
}

async function createContractFromApplication(applicationId) {
    try {
        // Получаем данные заявки
        const apps = await loadData("/api/applications");
        const app = apps.find(a => a.id === applicationId);
        
        if (!app) {
            showNotification("Заявка не найдена", true);
            return;
        }
        
        if (app.statusCode !== '03') {
            showNotification("Договор можно создать только для одобренной заявки (статус 'Одобрена')", true);
            return;
        }
        
        // Проверяем, нет ли уже договора по этой заявке
        const contracts = await loadData("/api/contracts");
        const existingContract = contracts.find(c => c.applicationId === applicationId);
        
        if (existingContract) {
            showNotification(`Договор № ${existingContract.contractNumber} уже существует`, true);
            return;
        }
        
        // Открываем форму создания договора с предзаполненными данными
        openModal(`
            <h2>Оформление кредитного договора</h2>
            <p style="color: #6b7280; margin-bottom: 20px;">На основе одобренной заявки № ${app.applicationNumber}</p>
            
            <div class="form-grid">
                <div>
                    <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">Клиент</label>
                    <input id="contractClientName" value="${app.clientName || app.clientId}" readonly style="background:#f3f4f6;">
                </div>
                <div>
                    <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">Одобренная сумма (₽)</label>
                    <input id="contractAmount" type="number" value="${app.requestedAmount}" style="background:#fef3c7; font-weight:bold;">
                </div>
                <div>
                    <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">Процентная ставка (%)</label>
                    <input id="contractRate" type="number" step="0.1" value="15.9" style="background:#fef3c7; font-weight:bold;">
                </div>
                <div>
                    <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">Срок кредита (мес)</label>
                    <input id="contractTerm" type="number" value="${app.termMonths}" style="background:#fef3c7; font-weight:bold;">
                </div>
                <div>
                    <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">Дата выдачи</label>
                    <input id="contractStartDate" type="date" value="${new Date().toISOString().split('T')[0]}">
                </div>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                <h4 style="margin: 0 0 10px 0; color: #166534;">📋 Предварительный расчёт ежемесячного платежа</h4>
                <p id="previewPayment" style="font-size: 18px; font-weight: bold; color: #166534;">--- ₽</p>
            </div>
            
            <div class="modal-actions">
                <button class="save" onclick="confirmCreateContract(${app.id}, ${app.clientId})">✅ Сформировать договор</button>
                <button class="cancel" onclick="closeModal()">Отмена</button>
            </div>
        `);
        
        // Добавляем расчёт предварительного платежа
        const amountInput = document.getElementById("contractAmount");
        const rateInput = document.getElementById("contractRate");
        const termInput = document.getElementById("contractTerm");
        const previewEl = document.getElementById("previewPayment");
        
        function updatePreview() {
            const amount = parseFloat(amountInput.value) || 0;
            const rate = parseFloat(rateInput.value) || 0;
            const months = parseInt(termInput.value) || 1;
            
            if (amount > 0 && rate > 0 && months > 0) {
                const monthlyRate = rate / 100 / 12;
                const payment = amount * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
                previewEl.innerHTML = `${Math.round(payment).toLocaleString()} ₽ / месяц`;
            } else {
                previewEl.innerHTML = "--- ₽";
            }
        }
        
        amountInput.addEventListener("input", updatePreview);
        rateInput.addEventListener("input", updatePreview);
        termInput.addEventListener("input", updatePreview);
        updatePreview();
        
    } catch (error) {
        console.error(error);
        showNotification("Ошибка при создании договора", true);
    }
}

async function confirmCreateContract(applicationId, clientId) {
    const approvedAmount = parseFloat(document.getElementById("contractAmount")?.value);
    const finalRate = parseFloat(document.getElementById("contractRate")?.value);
    const loanTermMonths = parseInt(document.getElementById("contractTerm")?.value);
    const startDate = document.getElementById("contractStartDate")?.value;
    
    if (!approvedAmount || !finalRate || !loanTermMonths) {
        showNotification("Заполните все поля", true);
        return;
    }
    
    try {
        // 1. Создаём договор
        const contractRes = await fetch("/api/contracts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                applicationId,
                clientId,
                approvedAmount,
                finalRate,
                loanTermMonths
            })
        });
        
        if (!contractRes.ok) throw new Error("Ошибка создания договора");
        const newContract = await contractRes.json();
        
        // 2. Генерируем график платежей
        const scheduleRes = await fetch("/api/generate-payment-schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contractId: newContract.id,
                applicationId,
                amount: approvedAmount,
                rate: finalRate,
                months: loanTermMonths,
                startDate: startDate || new Date().toISOString().split('T')[0]
            })
        });
        
        if (!scheduleRes.ok) throw new Error("Ошибка создания графика платежей");
        
        // 3. Обновляем статус заявки на "Договор сформирован" (код 05)
        await fetch(`/api/applications/${applicationId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                statusCode: '05',
                decisionComment: `Сформирован договор № ${newContract.contractNumber}`
            })
        });
        
        closeModal();
        showNotification(`Договор № ${newContract.contractNumber} успешно создан!`, false);
        showPage("contracts");
        
    } catch (error) {
        console.error(error);
        showNotification(error.message, true);
    }
}

async function signContract(contractId, applicationId) {
    if (!confirm("Подтвердить подписание договора обеими сторонами?")) return;
    
    try {
        // Обновляем статус договора
        await fetch(`/api/contracts/${contractId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: 'signed' })
        });
        
        // Обновляем статус заявки на "Договор подписан" (код 06)
        await fetch(`/api/applications/${applicationId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ statusCode: '06' })
        });
        
        showNotification("Договор подписан", false);
        showPage("contracts");
    } catch (error) {
        showNotification("Ошибка подписания", true);
    }
}

async function disburseLoan(contractId, applicationId) {
    if (!confirm("Подтвердить выдачу денежных средств клиенту?")) return;
    
    try {
        // Обновляем статус заявки на "Кредит выдан" (код 07)
        await fetch(`/api/applications/${applicationId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ statusCode: '07' })
        });
        
        showNotification("Кредит выдан! Денежные средства перечислены клиенту.", false);
        showPage("contracts");
    } catch (error) {
        showNotification("Ошибка выдачи кредита", true);
    }
}

showPage("dashboard");