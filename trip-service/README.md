# Voyzr — Trip Service
## Step-by-Step Setup & Execution Guide

---

## What You'll Need (Prerequisites)

Install these before starting:

| Tool | Version | Download |
|------|---------|----------|
| Java JDK | 17 or higher | https://adoptium.net |
| Maven | 3.8+ | https://maven.apache.org |
| Docker Desktop | Latest | https://docker.com/products/docker-desktop |
| IntelliJ IDEA | Community (free) | https://jetbrains.com/idea |
| Postman | Latest | https://postman.com |

Check you have them installed:
```bash
java --version      # should say 17.x.x
mvn --version       # should say Apache Maven 3.x.x
docker --version    # should say Docker version xx
```

---

## STEP 1 — Open the Project in IntelliJ

1. Open **IntelliJ IDEA**
2. Click **File → Open** and select the `trip-service` folder
3. IntelliJ will detect it's a Maven project and show a popup — click **"Load Maven Project"**
4. Wait for it to download all dependencies (bottom progress bar) — takes 2-5 mins first time
5. You should see no red errors in the `pom.xml` file

---

## STEP 2 — Start PostgreSQL with Docker

Open a **terminal** (or IntelliJ's built-in terminal: View → Tool Windows → Terminal):

```bash
# Navigate into the project folder
cd trip-service

# Start PostgreSQL in the background (-d = detached mode)
docker compose up -d

# Verify it's running (you should see "voyzr-postgres" in the list)
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE              STATUS          PORTS
abc123         postgres:15-alpine Up 2 minutes    0.0.0.0:5432->5432/tcp
def456         dpage/pgadmin4     Up 2 minutes    0.0.0.0:5050->80/tcp
```

> ✅ PostgreSQL is now running on `localhost:5432`
> ✅ pgAdmin (visual DB browser) is at http://localhost:5050

---

## STEP 3 — Run the Application

### Option A: From IntelliJ (easiest)
1. Open `src/main/java/com/voyzr/tripservice/TripServiceApplication.java`
2. Click the **green ▶ button** next to `public static void main`
3. Or right-click the file → **Run 'TripServiceApplication'**

### Option B: From Terminal
```bash
cd trip-service
mvn spring-boot:run
```

### Option C: Build JAR and run
```bash
mvn clean package -DskipTests
java -jar target/trip-service-1.0.0.jar
```

**You should see in the console:**
```
Started TripServiceApplication in 3.2 seconds
Tomcat started on port(s): 8081
```

> ✅ The app is running at **http://localhost:8081**

---

## STEP 4 — Test the Endpoints with Postman

### 4.1 — Import the collection
Copy-paste each request below into Postman, or create a new collection called "Voyzr Trip Service".

### 4.2 — Get a JWT token first

Since the Trip Service validates JWTs, you need a token.
For testing WITHOUT the Auth Service, you can temporarily bypass security:

**Temporary fix for testing** — in `SecurityConfig.java`, change:
```java
.requestMatchers("/api/trips/**").authenticated()
// TO:
.requestMatchers("/api/trips/**").permitAll()
```
Restart the app. Now you can test without a token.

> ⚠️ Remember to revert this change before submission!

---

### Request 1: Create a Trip

```
Method: POST
URL:    http://localhost:8081/api/trips
Header: Content-Type: application/json

Body (raw JSON):
{
  "name": "Munnar Weekend",
  "destination": "Eravikulam National Park, Munnar",
  "destinationLat": 10.0889,
  "destinationLng": 77.0595,
  "tripDate": "2025-04-15",
  "description": "Tea estate visit and trekking!"
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Trip created successfully",
  "data": {
    "id": 1,
    "name": "Munnar Weekend",
    "destination": "Eravikulam National Park, Munnar",
    "status": "UPCOMING",
    "memberCount": 1,
    "members": [...]
  }
}
```

---

### Request 2: Get All My Trips

```
Method: GET
URL:    http://localhost:8081/api/trips/my-trips
```

---

### Request 3: Get a Specific Trip

```
Method: GET
URL:    http://localhost:8081/api/trips/1
```

---

### Request 4: Join a Trip

```
Method: POST
URL:    http://localhost:8081/api/trips/1/join
```

---

### Request 5: Update a Trip

```
Method: PUT
URL:    http://localhost:8081/api/trips/1
Header: Content-Type: application/json

Body:
{
  "status": "LIVE",
  "description": "Updated description"
}
```

---

### Request 6: Delete a Trip

```
Method: DELETE
URL:    http://localhost:8081/api/trips/1
```

---

## STEP 5 — View the Database (Optional but impressive for demo)

1. Open **http://localhost:5050** in your browser (pgAdmin)
2. Login: `admin@voyzr.com` / `admin123`
3. Click **Add New Server**:
   - Name: `Voyzr Local`
   - Host: `postgres` (Docker network name) or `localhost`
   - Port: `5432`
   - Username: `voyzr_user`
   - Password: `voyzr_pass`
4. Expand: Servers → Voyzr Local → Databases → voyzr_trips → Schemas → Tables
5. You'll see `trips` and `trip_members` tables
6. Right-click a table → **View/Edit Data → All Rows** to see your data!

---

## STEP 6 — Run the Tests

```bash
# Run all tests
mvn test

# Run a specific test class
mvn test -Dtest=TripServiceTest

# Generate a test report
mvn test surefire-report:report
# Report saved to: target/site/surefire-report.html
```

**Expected output:**
```
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

> Tests use H2 in-memory database — PostgreSQL does NOT need to be running for tests.

---

## STEP 7 — Stop Everything

```bash
# Stop the Spring Boot app
Ctrl+C  (in the terminal where it's running)

# Stop Docker containers
docker compose down

# Stop containers AND delete all data (fresh start)
docker compose down -v
```

---

## Project Structure Reference

```
trip-service/
├── pom.xml                          ← Dependencies and build config
├── docker-compose.yml               ← Starts PostgreSQL
└── src/
    ├── main/
    │   ├── java/com/voyzr/tripservice/
    │   │   ├── TripServiceApplication.java   ← App entry point
    │   │   ├── controller/
    │   │   │   └── TripController.java       ← HTTP endpoints (REST API)
    │   │   ├── service/
    │   │   │   └── TripService.java          ← Business logic
    │   │   ├── repository/
    │   │   │   ├── TripRepository.java       ← DB queries for trips
    │   │   │   └── TripMemberRepository.java ← DB queries for members
    │   │   ├── entity/
    │   │   │   ├── Trip.java                 ← Maps to `trips` table
    │   │   │   └── TripMember.java           ← Maps to `trip_members` table
    │   │   ├── dto/
    │   │   │   └── TripDto.java              ← Request/response objects
    │   │   ├── security/
    │   │   │   ├── JwtUtil.java              ← Reads JWT tokens
    │   │   │   └── JwtAuthFilter.java        ← Validates every request
    │   │   ├── config/
    │   │   │   └── SecurityConfig.java       ← Security rules
    │   │   └── exception/
    │   │       └── GlobalExceptionHandler.java ← Error handling
    │   └── resources/
    │       └── application.yml               ← DB config, JWT secret, port
    └── test/
        ├── java/com/voyzr/tripservice/
        │   └── TripServiceTest.java          ← Unit & integration tests
        └── resources/
            └── application-test.yml          ← Uses H2 for tests
```

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Connection refused: localhost:5432` | PostgreSQL not running | Run `docker compose up -d` |
| `Port 8081 already in use` | Another app on that port | Change `server.port` in application.yml |
| `Failed to load ApplicationContext` | Spring config error | Check console for the root cause above it |
| `Table 'trips' not found` | JPA didn't create tables | Set `ddl-auto: create` in application.yml temporarily |
| `Unsatisfied dependency` | Missing bean | Make sure all classes have `@Service`, `@Repository` etc. |
