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
        // 1. Registrera en användare och logga in för att få en giltig token
        await request(app)
            .post('/api/register')
            .send({ username: 'outsider', password: 'password123' });

        const loginRes = await request(app)
            .post('/api/login')
            .send({ username: 'outsider', password: 'password123' });

        const token = loginRes.body.token;

        // 2. Skapa en cirkel med en annan användare (ID 1)
        circles.push({ id: 1, name: 'DevSecOps Group', members: [1] });

        // 3. Försök posta med giltig token, men som icke-medlem (användaren som loggade in har ID 2)
        const response = await request(app)
            .post('/api/circles/1/messages')
            .set('Authorization', `Bearer ${token}`) // Skickar med token så vi passerar 401
            .send({ text: 'Obehörigt meddelande' });

        // Nu ska servern släppa igenom token men neka medlemskapet med 403
        expect(response.statusCode).toBe(403);
        expect(response.body.error).toContain('Åtkomst nekad (403)');
    });
});