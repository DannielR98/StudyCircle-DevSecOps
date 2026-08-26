# StudyCircle - DevSecOps Social Platform

StudyCircle är en minimalistisk social webbapplikation utvecklad för att uppfylla kraven inom kontinuerlig utveckling, automation, säkerhet och åtkomstkontroll (DevSecOps).

---

## 1. Systemarkitektur & Feature Slices
Arbetet är uppdelat i vertikala **feature slices** snarare än traditionella horisontella lager. Det innebär att varje funktion utvecklas, testas och säkras som en oberoende, värdeskapande enhet som spänner över hela kedjan (från API/logik till säkerhetskontroller):

*   **Feature 1: Autentisering & Identitet**
    *   Hanterar registrering av användare och säker lösenordshashning (`bcrypt`).
    *   Säkerställer att användare identifieras korrekt innan interaktion tillåts.
*   **Feature 2: Cirkelhantering (Circles)**
    *   Möjliggör att användare skapar och ansluter till avgränsade grupper.
    *   Kopplar samman användar-ID med gruppmedlemskap i realtid.
*   **Feature 3: Meddelande- och Åtkomstflöde**
    *   Hanterar publicering och läsning av meddelanden inom specifika cirklar.
    *   Innehåller strikt *Authorization* (tvingande 403-kontroller) som blockerar obehöriga från att läsa eller skriva i grupper de inte tillhör.

---

## 2. Användarflöden (User Flows)

1.  **Onboarding & Autentisering:**
    *   *Start* -> Användaren anger användarnamn och lösenord -> Systemet hashar lösenordet säkert -> Kontot skapas (`201 Created`) -> Användaren loggar in.
2.  **Gruppskapande & Medlemskap:**
    *   *Inloggad användare* -> Skapar en ny cirkel med ett namn -> Användaren läggs automatiskt till som första medlem -> Andra användare kan ansluta sig till cirkeln via dess ID.
3.  **Flödesinteraktion (Säkerhetsgräns):**
    *   *Medlem/Icke-medlem* försöker hämta eller skicka meddelanden till en cirkel -> Systemet kontrollerar om användarens ID finns med i cirkelns medlemslista -> *Om ja:* Meddelandet visas/sparas. *Om nej:* Anropet stoppas omedelbart med `403 Forbidden`.

---

## 3. BDD-scenarier (Behavior-Driven Development)

Funktionaliteten och säkerhetskraven är definierade utifrån följande beteendescenarier ur ett användarperspektiv:

#### Scenario 1: Ny användare skapar ett konto och loggar in
*   **Givet** att jag är en besökare som inte har ett konto på StudyCircle,
*   **När** jag anger ett önskat användarnamn och lösenord och slutför registreringen,
*   **Så** ska mitt konto skapas säkert och jag ska kunna logga in för att börja använda tjänsten.

#### Scenario 2: Obehörig användare hindras från att delta i en skyddad cirkel
*   **Givet** att jag *inte* är med i en specifik studiegrupp ("cirkel"),
*   **När** jag försöker skriva eller läsa meddelanden i den gruppen,
*   **Så** ska systemet blockera mitt försök och visa ett meddelande om att jag saknar behörighet.

#### Scenario 3: Medlem delar innehåll i sin cirkel
*   **Givet** att jag är godkänd medlem i en studiegrupp ("cirkel"),
*   **När** jag skriver och skickar ett meddelande i gruppens flöde,
*   **Så** ska meddelandet omedelbart sparas och synas för de andra medlemmarna i gruppen.

---

## 4. CI/CD & DevSecOps-process

Projektet använder en automatiserad pipeline via GitHub Actions. Pipelinen triggar vid varje kodändring (`push` eller `pull_request`) för att säkerställa:
*   Att automatiska tester (BDD/integrationssäkerhet) körs grönt via `npm test`.
*   Att statisk kodanalys (SAST) utförs med **Semgrep** för att upptäcka kodsårbarheter.
*   Att beroendeskanning körs via `npm audit` för att blockera kända sårbarheter i tredjepartspaket.