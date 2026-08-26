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

#### Scenario 2: Misslyckad inloggning vid felaktiga uppgifter
*   **Givet** att jag har ett registrerat konto,
*   **När** jag försöker logga in med felaktigt lösenord eller obefintligt användarnamn,
*   **Så** ska systemet neka inloggning med en säkerhetskod (401 Unauthorized) och inte lämna ut känslig information.

#### Scenario 3: Användare skapar en ny cirkel
*   **Givet** att jag är inloggad som godkänd användare,
*   **När** jag skapar en ny cirkel med ett angivet namn,
*   **Så** ska cirkeln sparas i systemet och jag ska automatiskt läggas till som första medlem.

#### Scenario 4: Användare ansluter till en befintlig cirkel
*   **Givet** att det finns en skapad cirkel i systemet och jag är inloggad,
*   **När** jag väljer att gå med i cirkeln via dess ID,
*   **Så** ska jag registreras som medlem och få tillgång till cirkelns flöde.

#### Scenario 5: Medlem läser meddelanden i sin cirkel
*   **Givet** att jag är medlem i en specifik cirkel där det skickats meddelanden,
*   **När** jag begär att hämta meddelandeflödet för den cirkeln,
*   **Så** ska jag få en lista på samtliga meddelanden som har publicerats där.

#### Scenario 6: Medlem delar innehåll i sin cirkel
*   **Givet** att jag är godkänd medlem i en studiegrupp ("cirkel"),
*   **När** jag skriver och skickar ett meddelande i gruppens flöde,
*   **Så** ska meddelandet omedelbart sparas och synas för de andra medlemmarna i gruppen.

#### Scenario 7: Obehörig användare hindras från att delta i en skyddad cirkel
*   **Givet** att jag *inte* är med i en specifik studiegrupp ("cirkel"),
*   **När** jag försöker skriva eller läsa meddelanden i den gruppen,
*   **Så** ska systemet blockera mitt försök och svara med `403 Forbidden`.
---

## 4. CI/CD & DevSecOps-process

Projektet använder en automatiserad pipeline via GitHub Actions. Pipelinen triggar vid varje kodändring (`push` eller `pull_request`) för att säkerställa:
*   Att automatiska tester (BDD/integrationssäkerhet) körs grönt via `npm test`.
*   Att statisk kodanalys (SAST) utförs med **Semgrep** för att upptäcka kodsårbarheter.
*   Att beroendeskanning körs via `npm audit` för att blockera kända sårbarheter i tredjepartspaket.


För att testa lokalt kan vi köra:

# 1. Skapa unika variabler för testet
TEST_USER="user_$(date +%s)"
PASSWORD="securepassword123"

echo "=== 1. Testar hälsokontroll ==="
curl -s http://localhost:4000/health
echo -e "\n"

echo "=== 2. Testar registrering ($TEST_USER) ==="
REGISTER_RES=$(curl -s -X POST http://localhost:4000/api/register \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$TEST_USER\", \"password\": \"$PASSWORD\"}")
echo "$REGISTER_RES"
echo -e "\n"

echo "=== 3. Testar inloggning och hämtar JWT-token ==="
LOGIN_RES=$(curl -s -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$TEST_USER\", \"password\": \"$PASSWORD\"}")

# Extrahera token säkert utan node -e tty-fel
TOKEN=$(echo "$LOGIN_RES" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Kunde inte hämta token! Svar från server: $LOGIN_RES"
  exit 1
fi
echo "Token hämtad framgångsrikt!"
echo -e "\n"

echo "=== 4. Testar att skapa en cirkel ==="
CIRCLE_RES=$(curl -s -X POST http://localhost:4000/api/circles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "DevSecOps Studiegrupp"}')
echo "$CIRCLE_RES"

# Extrahera cirkel-ID säkert med grep
CIRCLE_ID=$(echo "$CIRCLE_RES" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$CIRCLE_ID" ]; then
  CIRCLE_ID=1
fi

echo -e "\nAnvänder Cirkel-ID: $CIRCLE_ID\n"

echo "=== 5. Testar att skriva ett meddelande i cirkeln ==="
MSG_RES=$(curl -s -X POST http://localhost:4000/api/circles/$CIRCLE_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"text": "Hej! Detta är ett automatiserat testmeddelande i cirkeln."}')
echo "$MSG_RES"
echo -e "\n"

echo "=== 6. Testar att hämta meddelandeflödet för cirkeln ==="
GET_MSGS=$(curl -s -X GET http://localhost:4000/api/circles/$CIRCLE_ID/messages \
  -H "Authorization: Bearer $TOKEN")
echo "$GET_MSGS"
echo -e "\n=== Test klart! ==="