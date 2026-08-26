const express = require('express');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const app = express();
const path = require('path');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();

app.use(express.json());
app.use(helmet());

const users = [];      
const circles = [];    
const messages = [];   

const JWT_SECRET = process.env.JWT_SECRET || 'lokal_utvecklings_nyckel_123';

// 1. Initiera SQLite-databasen (skapar filen database.sqlite i roten)
const dbFile = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Fel vid anslutning till databasen:', err.message);
    } else {
        console.log('Ansluten till SQLite-databasen.');
    }
});

// 2. Skapa tabeller om de inte finns (Körs vid uppstart)
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS circles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS circle_members (
        circle_id INTEGER,
        user_id INTEGER,
        FOREIGN KEY(circle_id) REFERENCES circles(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        circle_id INTEGER,
        user_id INTEGER,
        username TEXT,
        text TEXT,
        createdAt TEXT,
        FOREIGN KEY(circle_id) REFERENCES circles(id)
    )`);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'StudyCircle server is running!' });
});

// --- REGISTRERING ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Användarnamn och lösenord krävs.' });

        const hashedPassword = await bcrypt.hash(password, 10);

        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'Användarnamnet är upptaget.' });
                }
                return res.status(500).json({ error: 'Ett serverfel uppstod.' });
            }
            res.status(201).json({ message: 'Användare skapad!', userId: this.lastID, username });
        });
    } catch (err) {
        res.status(500).json({ error: 'Ett serverfel uppstod.' });
    }
});

// --- INLOGGNING ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err || !user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Felaktigt användarnamn eller lösenord.' });
        }

        const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Inloggning lyckades!', token, userId: user.id, username: user.username });
    });
});

// --- SÄKERHETSMIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Åtkomst nekad (401): Ingen token medföljde.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Åtkomst nekad (403): Ogiltig eller utgången token.' });
        req.user = user;
        next();
    });
};

// --- SKAPA CIRKEL ---
app.post('/api/circles', authenticateToken, (req, res) => {
    const { name } = req.body;
    const userId = req.user.userId;

    if (!name) return res.status(400).json({ error: 'Cirkelnamn krävs.' });

    db.run(`INSERT INTO circles (name) VALUES (?)`, [name], function(err) {
        if (err) return res.status(500).json({ error: 'Kunde inte skapa cirkel.' });
        const circleId = this.lastID;

        // Lägg till skaparen som medlem direkt
        db.run(`INSERT INTO circle_members (circle_id, user_id) VALUES (?, ?)`, [circleId, userId], () => {
            res.status(201).json({ message: 'Cirkel skapad!', circle: { id: circleId, name, members: [userId] } });
        });
    });
});

// --- GÅ MED I CIRKEL ---
app.post('/api/circles/:id/join', authenticateToken, (req, res) => {
    const circleId = Number(req.params.id);
    const userId = req.user.userId;

    db.get(`SELECT * FROM circles WHERE id = ?`, [circleId], (err, circle) => {
        if (err || !circle) return res.status(404).json({ error: 'Cirkeln hittades inte.' });

        // Kolla om användaren redan är medlem
        db.get(`SELECT * FROM circle_members WHERE circle_id = ? AND user_id = ?`, [circleId, userId], (err, member) => {
            if (!member) {
                db.run(`INSERT INTO circle_members (circle_id, user_id) VALUES (?, ?)`, [circleId, userId]);
            }
            res.status(200).json({ message: 'Gick med i cirkeln!' });
        });
    });
});

// --- HÄMTA MEDDELANDEN (Med säkerhetskontroll 403) ---
app.get('/api/circles/:id/messages', authenticateToken, (req, res) => {
    const circleId = Number(req.params.id);
    const userId = req.user.userId;

    db.get(`SELECT * FROM circle_members WHERE circle_id = ? AND user_id = ?`, [circleId, userId], (err, member) => {
        if (err || !member) {
            return res.status(403).json({ error: 'Åtkomst nekad (403): Du har inte behörighet att läsa denna cirkels flöde.' });
        }

        db.all(`SELECT * FROM messages WHERE circle_id = ?`, [circleId], (err, messages) => {
            res.status(200).json({ messages: messages || [] });
        });
    });
});

// --- POSTA MEDDELANDE ---
app.post('/api/circles/:id/messages', authenticateToken, (req, res) => {
    const circleId = Number(req.params.id);
    const { text } = req.body;
    const userId = req.user.userId;
    const username = req.user.username;

    db.get(`SELECT * FROM circle_members WHERE circle_id = ? AND user_id = ?`, [circleId, userId], (err, member) => {
        if (err || !member) {
            return res.status(403).json({ error: 'Åtkomst nekad (403): Du är inte medlem i denna cirkel.' });
        }

        const createdAt = new Date().toISOString();
        db.run(`INSERT INTO messages (circle_id, user_id, username, text, createdAt) VALUES (?, ?, ?, ?, ?)`,
            [circleId, userId, username, text, createdAt], function(err) {
                if (err) return res.status(500).json({ error: 'Kunde inte spara meddelande.' });
                res.status(201).json({ message: 'Meddelande skickat!', data: { id: this.lastID, circleId, userId, username, text, createdAt } });
            });
    });
});

module.exports = { app };