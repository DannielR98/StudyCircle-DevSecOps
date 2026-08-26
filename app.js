const express = require('express');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const app = express();
const path = require('path');
const jwt = require('jsonwebtoken');

app.use(express.json());
app.use(helmet());

const users = [];      
const circles = [];    
const messages = [];   

const JWT_SECRET = 'superhemlig_nyckel_123';

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'StudyCircle server is running!' });
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Användarnamn och lösenord krävs.' });

        if (users.find(u => u.username === username)) {
            return res.status(409).json({ error: 'Användarnamnet är upptaget.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { id: users.length + 1, username, password: hashedPassword };
        users.push(newUser);

        res.status(201).json({ message: 'Användare skapad!', userId: newUser.id, username: newUser.username });
    } catch (err) {
        res.status(500).json({ error: 'Ett serverfel uppstod.' });
    }
});

// 2. Uppdaterad inloggning som genererar en JWT-token
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = users.find(u => u.username === username);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Felaktigt användarnamn eller lösenord.' });
        }

        // Skapa en JWT-token som innehåller användarens ID och username (giltig i 1 timme)
        const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ 
            message: 'Inloggning lyckades!', 
            token: token, // Skickar token till klienten
            userId: user.id, 
            username: user.username 
        });
    } catch (err) {
        res.status(500).json({ error: 'Ett serverfel uppstod.' });
    }
});

// 3. SÄKERHETSMIDDLEWARE: Verifierar att användaren skickar med en giltig token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: 'Åtkomst nekad (401): Ingen token medföljde.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Åtkomst nekad (403): Ogiltig eller utgången token.' });
        }
        req.user = user; // Spara användarinfon på request-objektet
        next();
    });
};

// Skapa en ny cirkel (Nu skyddad med authenticateToken)
app.post('/api/circles', authenticateToken, (req, res) => {
    const { name } = req.body;
    const userId = req.user.userId; // Hämtas säkert från token istället för request body!

    if (!name) return res.status(400).json({ error: 'Cirkelnamn krävs.' });

    const newCircle = {
        id: circles.length + 1,
        name,
        members: [Number(userId)]
    };
    circles.push(newCircle);

    res.status(201).json({ message: 'Cirkel skapad!', circle: newCircle });
});




// Gå med i en cirkel (Skyddad)
app.post('/api/circles/:id/join', authenticateToken, (req, res) => {
    const circleId = Number(req.params.id);
    const userId = req.user.userId; // Säker hämtning

    const circle = circles.find(c => c.id === circleId);
    if (!circle) return res.status(404).json({ error: 'Cirkeln hittades inte.' });

    if (!circle.members.includes(Number(userId))) {
        circle.members.push(Number(userId));
    }

    res.status(200).json({ message: 'Gick med i cirkeln!', circle });
});

// Hämta meddelanden för en cirkel (Skyddad)
app.get('/api/circles/:id/messages', authenticateToken, (req, res) => {
    const circleId = Number(req.params.id);
    const userId = req.user.userId; // Säker hämtning från token

    const circle = circles.find(c => c.id === circleId);
    if (!circle) return res.status(404).json({ error: 'Cirkeln hittades inte.' });

    if (!circle.members.includes(userId)) {
        return res.status(403).json({ error: 'Åtkomst nekad (403): Du har inte behörighet att läsa denna cirkels flöde.' });
    }

    const circleMessages = messages.filter(m => m.circleId === circleId);
    res.status(200).json({ messages: circleMessages });
});

// Posta meddelanden i en cirkel (Skyddad)
app.post('/api/circles/:id/messages', authenticateToken, (req, res) => {
    const circleId = Number(req.params.id);
    const { text } = req.body;
    const userId = req.user.userId; // Säker hämtning från token
    const username = req.user.username;

    const circle = circles.find(c => c.id === circleId);
    if (!circle) return res.status(404).json({ error: 'Cirkeln hittades inte.' });

    if (!circle.members.includes(Number(userId))) {
        return res.status(403).json({ error: 'Åtkomst nekad (403): Du är inte medlem i denna cirkel.' });
    }

    const newMessage = {
        id: messages.length + 1,
        circleId,
        userId: Number(userId),
        username: username,
        text,
        createdAt: new Date()
    };
    messages.push(newMessage);

    res.status(201).json({ message: 'Meddelande skickat!', data: newMessage });
});

module.exports = { app, users, circles, messages };