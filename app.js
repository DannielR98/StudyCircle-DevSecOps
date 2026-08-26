const express = require('express');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const app = express();
const path = require('path');

app.use(express.json());
app.use(helmet());

const users = [];      
const circles = [];    
const messages = [];   

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

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = users.find(u => u.username === username);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Felaktigt användarnamn eller lösenord.' });
        }

        res.status(200).json({ message: 'Inloggning lyckades!', userId: user.id, username: user.username });
    } catch (err) {
        res.status(500).json({ error: 'Ett serverfel uppstod.' });
    }
});

// Skapa en ny cirkel
app.post('/api/circles', (req, res) => {
    const { name, userId } = req.body;
    if (!name || !userId) return res.status(400).json({ error: 'Cirkelnamn och userId krävs.' });

    const newCircle = {
        id: circles.length + 1,
        name,
        members: [Number(userId)]
    };
    circles.push(newCircle);

    res.status(201).json({ message: 'Cirkel skapad!', circle: newCircle });
});




// Gå med i en cirkel
app.post('/api/circles/:id/join', (req, res) => {
    const circleId = Number(req.params.id);
    const { userId } = req.body;

    const circle = circles.find(c => c.id === circleId);
    if (!circle) return res.status(404).json({ error: 'Cirkeln hittades inte.' });

    if (!circle.members.includes(Number(userId))) {
        circle.members.push(Number(userId));
    }

    res.status(200).json({ message: 'Gick med i cirkeln!', circle });
});

// Hämta meddelanden för en cirkel (Kräver medlemskap)
app.get('/api/circles/:id/messages', (req, res) => {
    const circleId = Number(req.params.id);
    const userId = Number(req.query.userId); // Skickas som query-param för enkelhet

    const circle = circles.find(c => c.id === circleId);
    if (!circle) return res.status(404).json({ error: 'Cirkeln hittades inte.' });

    // SÄKERHETSKRAV: Endast medlemmar får läsa meddelanden
    if (!circle.members.includes(userId)) {
        return res.status(403).json({ error: 'Åtkomst nekad (403): Du har inte behörighet att läsa denna cirkels flöde.' });
    }

    const circleMessages = messages.filter(m => m.circleId === circleId);
    res.status(200).json({ messages: circleMessages });
});

// Posta meddelanden i en cirkel (Kräver medlemskap)
app.post('/api/circles/:id/messages', (req, res) => {
    const circleId = Number(req.params.id);
    const { userId, text } = req.body;

    const circle = circles.find(c => c.id === circleId);
    if (!circle) return res.status(404).json({ error: 'Cirkeln hittades inte.' });

    // SÄKERHETSKRAV: Kontrollera om användaren är medlem i cirkeln
    if (!circle.members.includes(Number(userId))) {
        return res.status(403).json({ error: 'Åtkomst nekad (403): Du är inte medlem i denna cirkel.' });
    }

    const user = users.find(u => u.id === Number(userId));
    const newMessage = {
        id: messages.length + 1,
        circleId,
        userId: Number(userId),
        username: user ? user.username : 'Okänd',
        text,
        createdAt: new Date()
    };
    messages.push(newMessage);

    res.status(201).json({ message: 'Meddelande skickat!', data: newMessage });
});


module.exports = { app, users, circles, messages };