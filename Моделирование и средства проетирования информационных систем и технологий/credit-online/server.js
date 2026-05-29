const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");

const app = express();
const db = new sqlite3.Database("./database.db");

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* Клиенты */

app.get("/api/clients", (req, res) => {
    db.all("SELECT * FROM clients", [], (err, rows) => {
        res.json(rows);
    });
});

app.post("/api/clients", (req, res) => {
    const {
        lastName,
        firstName,
        middleName,
        birthDate,
        passport,
        inn,
        phone,
        email
    } = req.body;

    db.run(
        `INSERT INTO clients
        (lastName, firstName, middleName, birthDate, passport, inn, phone, email)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            lastName,
            firstName,
            middleName,
            birthDate,
            passport,
            inn,
            phone,
            email
        ],
        function () {
            res.json({ id: this.lastID });
        }
    );
});

/* Заявки */

app.get("/api/applications", (req, res) => {
    db.all("SELECT * FROM applications", [], (err, rows) => {
        res.json(rows);
    });
});

app.post("/api/applications", (req, res) => {
    const {
        client,
        creditType,
        employee,
        amount,
        term,
        status,
        comment
    } = req.body;

    db.run(
        `INSERT INTO applications
        (client, creditType, employee, amount, term, status, comment)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            client,
            creditType,
            employee,
            amount,
            term,
            status,
            comment
        ],
        function () {
            res.json({ id: this.lastID });
        }
    );
});

/* Главная */

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
});

app.listen(3000, () => {
    console.log("Сервер запущен: http://localhost:3000");
});