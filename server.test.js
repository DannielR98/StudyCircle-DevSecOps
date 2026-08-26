const request = require('supertest');
const { app, users, circles } = require('./app');

describe('StudyCircle BDD & Security Tests', () => {
    
    test('GET /health should return status 200 and UP', async () => {
        const response = await request(app).get('/health');
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('UP');
    });

    test('Scenario: Secure user registration hashes password', async () => {
        const response = await request(app)
            .post('/api/register')
            .send({ username: 'testuser', password: 'securepassword123' });

        expect(response.statusCode).toBe(201);
        expect(response.body.userId).toBeDefined();
        // Kontrollera att lösenordet lagras hashat
        expect(users[0].password).not.toBe('securepassword123');
    });

    test('Scenario: Access control prevents non-members from posting (403 Forbidden)', async () => {
        // Skapa en cirkel med användare 1
        circles.push({ id: 1, name: 'DevSecOps Group', members: [1] });

        // Försök posta som användare 99 (ej medlem)
        const response = await request(app)
            .post('/api/circles/1/messages')
            .send({ userId: 99, text: 'Obehörigt meddelande' });

        expect(response.statusCode).toBe(403);
        expect(response.body.error).toContain('Åtkomst nekad (403)');
    });
});