const express = require('express');
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Enkel "in-memory" databas för att hålla projektet enkelt (ersätts med riktig DB senare om ni vill)
const users = [];

// Hälsokontroll
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'StudyCircle server is running!' });
});

// 1. REGISTRERA ANVÄNDARE
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Användarnamn och lösenord krävs.' });
        }

        // Kolla om användaren redan finns
        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            return res.status(409).json({ error: 'Användarnamnet är upptaget.' });
        }

        // Hasha lösenordet (Säkerhetskrav!)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Spara användaren
        const newUser = { id: users.length + 1, username, password: hashedPassword };
        users.push(newUser);

        res.status(201).json({ message: 'Användare skapad!', userId: newUser.id, username: newUser.username });
    } catch (err) {
        res.status(500).json({ error: 'Ett serverfel uppstod vid registrering.' });
    }
});

// 2. LOGGA IN ANVÄNDARE
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Hitta användaren
        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(401).json({ error: 'Felaktigt användarnamn eller lösenord.' });
        }

        // Jämför lösenordet med det hashade
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Felaktigt användarnamn eller lösenord.' });
        }

        res.status(200).json({ message: 'Inloggning lyckades!', username: user.username });
    } catch (err) {
        res.status(500).json({ error: 'Ett serverfel uppstod vid inloggning.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});