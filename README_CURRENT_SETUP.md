# ClaimGPT Setup Guide (Docker Stack)

Follow these steps to run the ClaimGPT application. This guide ensures all code updates are built from scratch in Docker, database migrations are applied before the main services boot, and the stack runs cleanly.

---

> [!IMPORTANT]
> **Branching Policy**: Please do **NOT** make any code modifications or commits directly on the `feature/docker-integrated` branch. After pulling this branch, create a duplicate/local feature branch to do your work.
> 
> Run the following command to create and switch to your feature branch:
> ```bash
> git checkout -b <your-feature-branch-name>
> ```

---

## 1. Environment Configuration
Make sure you have `.env` files in both the project root and the `infra/docker/` directory. If they don't exist, copy `.env.example` to `.env` in both locations and configure your API keys:
```properties
# Add your API keys to the .env files
OPENROUTER_API_KEY=your_openrouter_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### Host Environment setup (For running migrations locally):
Install the local Python database dependencies (`pymssql`, `pyodbc`) inside your host virtual environment:
```powershell
.venv\Scripts\pip install -r requirements-gateway.txt
```

---

## 2. Clean and Stop Previous Builds
Stop all running containers and clean up existing Docker resources to prevent conflicts:
```powershell
docker compose -f infra/docker/docker-compose.yml down
```

---

## 3. Build Containers from Scratch
Build all backend and worker Docker images from scratch to compile the pulled code changes:
```powershell
docker compose -f infra/docker/docker-compose.yml build --no-cache
```

---

## 4. Start the Database Container
Start the MS SQL Server container and wait for it to report healthy:
```powershell
docker compose -f infra/docker/docker-compose.yml up -d mssql-db
```

---

## 5. Initialize the Database
Microsoft SQL Server starts up blank. You must create the `claimgpt` database inside the container before running migrations:
```powershell
docker exec docker-mssql-db-1 /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong!Password" -Q "CREATE DATABASE claimgpt;" -C
```

---

## 6. Run Database Migrations
Apply the database migrations from your host terminal (Alembic will automatically use the `pymssql` configuration from your `.env` file to create the tables):
```powershell
.venv\Scripts\alembic upgrade head
```

---

## 7. Start the Rest of the Stack
Now that the database tables are created, start all other backend services, Celery workers, and infrastructure in the background:
```powershell
docker compose -f infra/docker/docker-compose.yml up -d
```

---

## 8. Start the Frontend
The frontend runs locally using Node.js:
```powershell
cd ui/web
npm install
npm run dev
```

---

## 9. Access and Monitoring URLs

- **Frontend UI**: [http://localhost:3000](http://localhost:3000)
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Flower (Celery Worker Monitor)**: [http://localhost:5555/flower/](http://localhost:5555/flower/)
- **MinIO Storage Console**: [http://localhost:9001](http://localhost:9001) (User: `claimgpt` / Pass: `claimgpt123`)
