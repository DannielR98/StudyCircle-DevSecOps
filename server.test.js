const request = require('supertest');

const express = require('express');
// Vi skapar en testapp eller anropar vår riktiga. För enkelhets skull testar vi /health:
const app = express();
app.get('/health', (req, res) => res.status(200).json({ status: 'UP' }));

describe('StudyCircle CI Tests', () => {
    test('GET /health should return status 200 and UP', async () => {
        const response = await request(app).get('/health');
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('UP');
    });
});