const express = require('express');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const app = express();

app.use(express.json());
app.use(helmet());

const users = [];      
const circles = [];    
const messages = [];   

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

app.post('/api/circles/:id/messages', (req, res) => {
    const circleId = Number(req.params.id);
    const { userId, text } = req.body;

    const circle = circles.find(c => c.id === circleId);
    if (!circle) return res.status(404).json({ error: 'Cirkeln hittades inte.' });

    if (!circle.members.includes(Number(userId))) {
        return res.status(403).json({ error: 'Åtkomst nekad (403): Du är inte medlem i denna cirkel.' });
    }

    const newMessage = { id: messages.length + 1, circleId, userId: Number(userId), text, createdAt: new Date() };
    messages.push(newMessage);

    res.status(201).json({ message: 'Meddelande skickat!', data: newMessage });
});

module.exports = { app, users, circles, messages };