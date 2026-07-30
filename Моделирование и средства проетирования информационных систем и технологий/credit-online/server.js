const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");

const app = express();
const db = new sqlite3.Database("./database.db");

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ============ КЛИЕНТЫ (сущность из стр. 46-47) ============
app.get("/api/clients", (req, res) => {
    db.all("SELECT * FROM clients ORDER BY lastName", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post("/api/clients", (req, res) => {
    const { lastName, firstName, middleName, birthDate, passportSeries, passportNumber, inn, phone, email } = req.body;
    db.run(
        `INSERT INTO clients (lastName, firstName, middleName, birthDate, passportSeries, passportNumber, inn, phone, email)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [lastName, firstName, middleName, birthDate, passportSeries, passportNumber, inn, phone, email],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.delete("/api/clients/:id", (req, res) => {
    db.run("DELETE FROM clients WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// ============ ТИПЫ КРЕДИТА (справочник, стр. 47) ============
app.get("/api/credit-types", (req, res) => {
    db.all("SELECT * FROM credit_types ORDER BY code", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ============ СОТРУДНИКИ (стр. 47-48) ============
app.get("/api/employees", (req, res) => {
    db.all("SELECT * FROM employees ORDER BY lastName", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ============ ЗАЯВКИ (центральная сущность, стр. 48) ============
app.get("/api/applications", (req, res) => {
    db.all(`
        SELECT a.*, 
               c.lastName || ' ' || c.firstName AS clientName,
               ct.name AS creditTypeName,
               e.lastName || ' ' || e.firstName AS employeeName
        FROM applications a
        LEFT JOIN clients c ON a.clientId = c.id
        LEFT JOIN credit_types ct ON a.creditTypeId = ct.id
        LEFT JOIN employees e ON a.employeeId = e.id
        ORDER BY a.applicationDate DESC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post("/api/applications", (req, res) => {
    const { clientId, creditTypeId, employeeId, requestedAmount, termMonths, statusCode, decisionComment } = req.body;
    const applicationNumber = `APP-${Date.now()}`;
    const applicationDate = new Date().toISOString().split('T')[0];
    
    db.run(
        `INSERT INTO applications (applicationNumber, clientId, creditTypeId, employeeId, applicationDate, requestedAmount, termMonths, statusCode, decisionComment)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [applicationNumber, clientId, creditTypeId, employeeId, applicationDate, requestedAmount, termMonths, statusCode, decisionComment],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, applicationNumber });
        }
    );
});

app.put("/api/applications/:id", (req, res) => {
    const { statusCode, decisionComment, securityCheckResult, scoringResult, scoringScore, decisionDate } = req.body;
    const updateDate = decisionDate || new Date().toISOString().split('T')[0];
    
    db.run(
        `UPDATE applications 
         SET statusCode = ?, decisionComment = ?, securityCheckResult = ?, scoringResult = ?, scoringScore = ?, decisionDate = ?
         WHERE id = ?`,
        [statusCode, decisionComment, securityCheckResult, scoringResult, scoringScore, updateDate, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ updated: this.changes });
        }
    );
});

// ============ КРЕДИТНЫЕ ДОГОВОРЫ (стр. 48-49) ============
app.get("/api/contracts", (req, res) => {
    db.all(`
        SELECT c.*, 
               cl.lastName || ' ' || cl.firstName AS clientName,
               a.applicationNumber,
               a.requestedAmount,
               a.termMonths
        FROM contracts c
        LEFT JOIN clients cl ON c.clientId = cl.id
        LEFT JOIN applications a ON c.applicationId = a.id
        ORDER BY c.signDate DESC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post("/api/contracts", (req, res) => {
    const { applicationId, clientId, approvedAmount, finalRate, loanTermMonths } = req.body;
    const contractNumber = `CTR-${Date.now()}`;
    const signDate = new Date().toISOString().split('T')[0];
    
    db.run(
        `INSERT INTO contracts (contractNumber, applicationId, clientId, signDate, approvedAmount, finalRate, loanTermMonths)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [contractNumber, applicationId, clientId, signDate, approvedAmount, finalRate, loanTermMonths],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, contractNumber });
        }
    );
});

// ============ ГРАФИК ПЛАТЕЖЕЙ (стр. 49) ============
app.get("/api/payment-schedules/:contractId", (req, res) => {
    db.all(`
        SELECT * FROM payment_schedules 
        WHERE contractId = ?
        ORDER BY paymentNumber
    `, [req.params.contractId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Расчёт аннуитетного графика платежей
function calculatePaymentSchedule(contractId, applicationId, amount, rate, months, startDate) {
    const monthlyRate = rate / 100 / 12;
    const annuityPayment = amount * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
    let remainingDebt = amount;
    const schedule = [];
    
    for (let i = 1; i <= months; i++) {
        const interestAmount = remainingDebt * monthlyRate;
        const principalAmount = annuityPayment - interestAmount;
        remainingDebt -= principalAmount;
        
        const paymentDate = new Date(startDate);
        paymentDate.setMonth(paymentDate.getMonth() + i);
        
        schedule.push({
            contractId,
            applicationId,
            paymentNumber: i,
            paymentDate: paymentDate.toISOString().split('T')[0],
            principalAmount: Math.round(principalAmount),
            interestAmount: Math.round(interestAmount),
            totalPayment: Math.round(annuityPayment),
            remainingDebt: Math.round(Math.max(0, remainingDebt))
        });
    }
    return schedule;
}

app.post("/api/generate-payment-schedule", (req, res) => {
    const { contractId, applicationId, amount, rate, months, startDate } = req.body;
    const schedule = calculatePaymentSchedule(contractId, applicationId, amount, rate, months, startDate);
    
    const stmt = db.prepare(`
        INSERT INTO payment_schedules (contractId, applicationId, paymentNumber, paymentDate, principalAmount, interestAmount, totalPayment, remainingDebt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    schedule.forEach(p => {
        stmt.run(p.contractId, p.applicationId, p.paymentNumber, p.paymentDate, p.principalAmount, p.interestAmount, p.totalPayment, p.remainingDebt);
    });
    stmt.finalize();
    
    res.json({ generated: schedule.length, schedule });
});

// ============ ОТЧЁТЫ ============
app.get("/api/reports/issued-credits", (req, res) => {
    const { startDate, endDate } = req.query;
    
    let query = `
        SELECT 
            c.contractNumber, 
            c.approvedAmount, 
            c.finalRate, 
            c.signDate, 
            c.loanTermMonths,
            c.status,
            cl.lastName || ' ' || cl.firstName AS clientName,
            COALESCE(ct.name, 'Не указан') AS creditTypeName
        FROM contracts c
        LEFT JOIN clients cl ON c.clientId = cl.id
        LEFT JOIN applications a ON c.applicationId = a.id
        LEFT JOIN credit_types ct ON a.creditTypeId = ct.id
        WHERE 1=1
    `;
    
    const params = [];
    if (startDate && endDate) {
        query += ` AND c.signDate BETWEEN ? AND ?`;
        params.push(startDate, endDate);
    }
    
    query += ` ORDER BY c.signDate DESC`;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("Ошибка запроса отчёта:", err.message);
            return res.status(500).json({ error: err.message });
        }
        
        const totalAmount = rows.reduce((sum, r) => sum + (r.approvedAmount || 0), 0);
        const avgRate = rows.length > 0 ? rows.reduce((sum, r) => sum + (r.finalRate || 0), 0) / rows.length : 0;
        
        res.json({
            credits: rows,
            summary: {
                totalAmount: totalAmount,
                count: rows.length,
                averageAmount: rows.length > 0 ? totalAmount / rows.length : 0,
                averageRate: Math.round(avgRate * 10) / 10
            }
        });
    });
});

// ============ СТАТИСТИКА ДЛЯ ДАШБОРДА ============
app.get("/api/dashboard-stats", (req, res) => {
    db.get(`
        SELECT 
            (SELECT COUNT(*) FROM applications WHERE statusCode IN ('02', '03')) AS activeApplications,
            (SELECT COUNT(*) FROM contracts WHERE status = 'active') AS issuedCredits,
            (SELECT COUNT(*) FROM applications WHERE statusCode = '03') AS approvedApplications,
            (SELECT COUNT(*) FROM applications WHERE statusCode = '04') AS rejectedApplications
    `, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

app.get("/api/chart-data", (req, res) => {
    db.all(`
        SELECT ct.name, COUNT(a.id) as count
        FROM applications a
        JOIN credit_types ct ON a.creditTypeId = ct.id
        GROUP BY ct.name
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(3000, () => {
    console.log("Сервер запущен: http://localhost:3000");
    console.log("Структура БД соответствует IDEF1X из раздела 4.1 курсового проекта");
});

app.put("/api/contracts/:id", (req, res) => {
    const { status } = req.body;
    db.run("UPDATE contracts SET status = ? WHERE id = ?", [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});