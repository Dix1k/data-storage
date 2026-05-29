const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.db");

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lastName TEXT,
            firstName TEXT,
            middleName TEXT,
            birthDate TEXT,
            passport TEXT,
            inn TEXT,
            phone TEXT,
            email TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client TEXT,
            creditType TEXT,
            employee TEXT,
            amount INTEGER,
            term INTEGER,
            status TEXT,
            comment TEXT
        )
    `);

    db.run(`
        INSERT INTO clients
        (lastName, firstName, middleName, birthDate, passport, inn, phone, email)
        VALUES
        ('Иванов','Иван','Иванович','1990-05-10','4510123456','123456789012','89990000000','ivan@mail.ru')
    `);

});

console.log("База создана");