const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.db");

db.serialize(() => {
    // Сущность "Клиент" (стр. 46-47 курсового проекта)
    db.run(`
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lastName TEXT NOT NULL,
            firstName TEXT NOT NULL,
            middleName TEXT,
            birthDate TEXT NOT NULL,
            passportSeries TEXT,
            passportNumber TEXT,
            inn TEXT UNIQUE,
            phone TEXT NOT NULL,
            email TEXT
        )
    `);

    // Сущность "Тип кредита" - справочник (стр. 47)
    db.run(`
        CREATE TABLE IF NOT EXISTS credit_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            minAmount REAL,
            maxAmount REAL,
            baseRate REAL NOT NULL,
            minTermMonths INTEGER,
            maxTermMonths INTEGER
        )
    `);

    // Сущность "Сотрудник" (стр. 47-48)
    db.run(`
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lastName TEXT NOT NULL,
            firstName TEXT NOT NULL,
            middleName TEXT,
            position TEXT NOT NULL,
            department TEXT
        )
    `);

    // Сущность "Заявка" (центральная сущность, стр. 48)
    db.run(`
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            applicationNumber TEXT UNIQUE NOT NULL,
            clientId INTEGER NOT NULL,
            creditTypeId INTEGER NOT NULL,
            employeeId INTEGER NOT NULL,
            applicationDate TEXT NOT NULL,
            requestedAmount REAL NOT NULL,
            termMonths INTEGER NOT NULL,
            statusCode TEXT NOT NULL,
            decisionDate TEXT,
            decisionComment TEXT,
            securityCheckResult TEXT,
            scoringResult TEXT,
            scoringScore INTEGER,
            FOREIGN KEY (clientId) REFERENCES clients(id),
            FOREIGN KEY (creditTypeId) REFERENCES credit_types(id),
            FOREIGN KEY (employeeId) REFERENCES employees(id)
        )
    `);

    // Сущность "Кредитный договор" (стр. 48-49)
    db.run(`
        CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contractNumber TEXT UNIQUE NOT NULL,
            applicationId INTEGER NOT NULL,
            clientId INTEGER NOT NULL,
            signDate TEXT NOT NULL,
            approvedAmount REAL NOT NULL,
            finalRate REAL NOT NULL,
            loanTermMonths INTEGER NOT NULL,
            status TEXT DEFAULT 'active',
            FOREIGN KEY (applicationId) REFERENCES applications(id),
            FOREIGN KEY (clientId) REFERENCES clients(id)
        )
    `);

    // Сущность "График платежей" (стр. 49)
    db.run(`
        CREATE TABLE IF NOT EXISTS payment_schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contractId INTEGER NOT NULL,
            applicationId INTEGER NOT NULL,
            paymentNumber INTEGER NOT NULL,
            paymentDate TEXT NOT NULL,
            principalAmount REAL NOT NULL,
            interestAmount REAL NOT NULL,
            totalPayment REAL NOT NULL,
            remainingDebt REAL NOT NULL,
            FOREIGN KEY (contractId) REFERENCES contracts(id),
            FOREIGN KEY (applicationId) REFERENCES applications(id)
        )
    `);

    // Заполнение справочника "Тип кредита" (классификатор из табл. 7)
    db.run(`INSERT OR IGNORE INTO credit_types (code, name, minAmount, maxAmount, baseRate, minTermMonths, maxTermMonths) 
            VALUES ('1', 'Потребительский кредит', 10000, 1000000, 15.9, 3, 60)`);
    db.run(`INSERT OR IGNORE INTO credit_types (code, name, minAmount, maxAmount, baseRate, minTermMonths, maxTermMonths) 
            VALUES ('2', 'Кредит наличными', 5000, 500000, 18.5, 1, 36)`);
    db.run(`INSERT OR IGNORE INTO credit_types (code, name, minAmount, maxAmount, baseRate, minTermMonths, maxTermMonths) 
            VALUES ('3', 'Автокредит', 100000, 3000000, 12.5, 12, 84)`);
    db.run(`INSERT OR IGNORE INTO credit_types (code, name, minAmount, maxAmount, baseRate, minTermMonths, maxTermMonths) 
            VALUES ('4', 'Ипотека', 300000, 15000000, 10.9, 36, 360)`);
    db.run(`INSERT OR IGNORE INTO credit_types (code, name, minAmount, maxAmount, baseRate, minTermMonths, maxTermMonths) 
            VALUES ('5', 'Рефинансирование', 50000, 3000000, 14.5, 6, 120)`);
    db.run(`INSERT OR IGNORE INTO credit_types (code, name, minAmount, maxAmount, baseRate, minTermMonths, maxTermMonths) 
            VALUES ('6', 'Кредитная карта', 10000, 300000, 25.9, 0, 0)`);
    db.run(`INSERT OR IGNORE INTO credit_types (code, name, minAmount, maxAmount, baseRate, minTermMonths, maxTermMonths) 
            VALUES ('7', 'Образовательный кредит', 20000, 500000, 9.5, 6, 120)`);

    // Заполнение справочника "Сотрудник" (кредитные специалисты, СБ, кассиры)
    db.run(`INSERT OR IGNORE INTO employees (lastName, firstName, middleName, position, department) 
            VALUES ('Петров', 'Пётр', 'Петрович', 'Кредитный специалист', 'Кредитный отдел')`);
    db.run(`INSERT OR IGNORE INTO employees (lastName, firstName, middleName, position, department) 
            VALUES ('Сидорова', 'Анна', 'Ивановна', 'Кредитный специалист', 'Кредитный отдел')`);
    db.run(`INSERT OR IGNORE INTO employees (lastName, firstName, middleName, position, department) 
            VALUES ('Козлов', 'Дмитрий', 'Сергеевич', 'Служба безопасности', 'Отдел безопасности')`);
    db.run(`INSERT OR IGNORE INTO employees (lastName, firstName, middleName, position, department) 
            VALUES ('Морозова', 'Елена', 'Александровна', 'Кассир', 'Операционный отдел')`);

    // Добавление тестового клиента
    db.run(`INSERT OR IGNORE INTO clients (lastName, firstName, middleName, birthDate, passportSeries, passportNumber, inn, phone, email) 
            VALUES ('Иванов', 'Иван', 'Иванович', '1990-05-10', '4510', '123456', '123456789012', '+79990000000', 'ivan@example.com')`);

    // Добавление тестовой заявки (статус 01 - Черновик по классификатору табл.6)
    db.run(`
        INSERT OR IGNORE INTO applications 
        (applicationNumber, clientId, creditTypeId, employeeId, applicationDate, requestedAmount, termMonths, statusCode, decisionComment)
        VALUES ('APP-001', 1, 1, 1, date('now'), 500000, 36, '01', 'Новая заявка')
    `);

    console.log("База данных создана со структурой, соответствующей IDEF1X (раздел 4.1)");
    console.log("Сущности: clients, credit_types, employees, applications, contracts, payment_schedules");
});

db.close();