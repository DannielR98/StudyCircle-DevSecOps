# StudyCircle - DevSecOps Social Platform

StudyCircle är en minimalistisk social webbapplikation utvecklad för att uppfylla kraven inom kontinuerlig utveckling, automation, säkerhet och åtkomstkontroll (DevSecOps).

---

## 1. Systemarkitektur & Teknikval

Applikationen är uppbyggd med en modulär och lättviktig stack som lämpar sig väl för automatiserad CI/CD och containerisering:
*   **Backend:** Node.js med Express (REST API).
*   **Säkerhet & Identitet:** `bcrypt` för lösenordshashning samt strikt roll- och medlemskapsverifiering (Authorization) för skyddade resurser.
*   **CI/CD Pipeline:** GitHub Actions för automatiserad byggning och verifiering vid varje push/pull request.
*   **Arkitektoniskt mönster:** Monolitisk API-design uppdelad i vertikala *feature slices* (autentisering, grupper/circles, meddelandehantering).

---

## 2. Användarflöden (User Flows)

1.  **Registrering & Inloggning:** Användaren skapar ett konto med användarnamn och lösenord. Lösenordet hashas säkert innan det lagras. Vid inloggning verifieras uppgifterna mot den krypterade hashen.
2.  **Cirkelhantering:** En inloggad användare kan skapa en ny "circle" (grupp) eller ansluta sig till befintliga grupper. Skaparen blir automatiskt tillagd som första medlem.
3.  **Delning av innehåll med åtkomstkontroll:** Medlemmar i en cirkel kan posta och läsa meddelanden. Om en icke-medlem försöker läsa eller skriva i en skyddad cirkel nekas anropet direkt med statuskod `403 Forbidden`.

---

## 3. BDD-scenarier (Behavior-Driven Development)

Funktionaliteten och säkerhetskraven är definierade utifrån följande beteendescenarier:

### Scenario 1: Säker registrering och inloggning
*   **Givet** att en användare inte har ett konto i systemet,
*   **När** användaren skickar ett registreringsanrop med användarnamn och lösenord,
*   **Så** ska lösenordet hashas och en ny användare skapas med status `201 Created`.

### Scenario 2: Åtkomstkontroll till skyddade "Circles"
*   **Givet** att en användare *inte* är medlem i cirkel med ID `1`,
*   **När** användaren försöker skicka ett meddelande till cirkel `1`,
*   **Så** ska systemet avbryta anropet och svara med `403 Forbidden` samt ett felmeddelande om att åtkomst saknas.

### Scenario 3: Godkänd kommunikation inom cirkeln
*   **Givet** att en användare är medlem i cirkel med ID `1`,
*   **När** användaren postar ett meddelande till cirkel `1`,
*   **Så** ska meddelandet sparas och returneras till klienten med status `201 Created`.

---

## 4. CI/CD & DevSecOps-process

Projektet använder en automatiserad pipeline via GitHub Actions. Pipelinen triggar vid varje kodändring (`push` eller `pull_request`) till huvudgrenen för att säkerställa:
*   Att kodbasen kompilerar och kan starta utan beroendefel.
*   Att inga regressioner introduceras i API-endpoints.

2026-08-26 13:48: lagt till automatiserade tester och säkerhetsskanning i pipelinen