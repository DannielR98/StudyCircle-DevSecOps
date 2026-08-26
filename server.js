const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware för att kunna läsa JSON-data i requests
app.use(express.json());

// Enkel hälsokontroll-endpoint (bra att ha för CI/CD och hälsokontroller)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'StudyCircle server is running!' });
});

// Starta servern
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});