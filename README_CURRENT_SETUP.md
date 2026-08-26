# ClaimGPT Setup Guide (Docker Stack)

Follow these steps to run the ClaimGPT application. This guide ensures all code updates are built from scratch in Docker, database migrations are applied before the main services boot, and the stack runs cleanly.

---

> [!IMPORTANT]
> **Branching Policy**: Please do **NOT** make any code modifications or commits directly on the `feature/azure-migration` branch. After pulling this branch, create a duplicate/local feature branch to do your work.
> 
> Run the following command to create and switch to your feature branch:
> ```bash
> git checkout -b <your-feature-branch-name>
> ```

---

## 1. Environment Configuration
Place the shared `.env` file in the project root. You **MUST** copy the configured `.env` file into the `infra/docker/` directory so Docker Compose can successfully read and interpolate the environment variables during build and runtime:

```powershell
Copy-Item -Path ".env" -Destination "infra/docker/.env"
```

### Host Environment setup (For running migrations locally):
Create a virtual environment if you don't have one, and install the local Python database dependencies (`pymssql`, `pyodbc`):
```powershell
python -m venv .venv
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

## 5. Initialize the Database and Seed Roles
Microsoft SQL Server starts up blank. You must create the `claimgpt` database and insert the core system roles inside the container before running migrations (note: container name may vary between `docker-mssql-db-1` or `claimgpt-feature-mssql-db-1` based on your docker engine version):
```powershell
# Create the database
docker exec claimgpt-feature-mssql-db-1 /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong!Password" -Q "CREATE DATABASE claimgpt;" -C

# Seed system roles
docker exec claimgpt-feature-mssql-db-1 /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong!Password" -d claimgpt -Q "INSERT INTO roles (id, name, description) VALUES (NEWID(), 'admin', 'Admin role'), (NEWID(), 'reviewer', 'Reviewer role'), (NEWID(), 'submitter', 'Submitter role'), (NEWID(), 'viewer', 'Viewer role'), (NEWID(), 'tpa_adjuster', 'TPA Adjuster role');" -C
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

## 9. LangGraph & Chat Service Checkpointer
*   **Database compatibility**: LangGraph's default `AsyncPostgresSaver` throws warnings and shuts down when pointing to an MS SQL Database.
*   **Automatic Fallback**: The gateway lifespan has been updated to check the database dialect at startup. If running on MS SQL, it automatically falls back to LangGraph's `MemorySaver` (in-memory) checkpointer, keeping the chat interface fully functional with zero database dependency warnings.

---

## 10. Access and Monitoring URLs

- **Frontend UI**: [http://localhost:3000](http://localhost:3000)
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Flower (Celery Worker Monitor)**: [http://localhost:5555/flower/](http://localhost:5555/flower/)
- **Active Storage Location**: 
  - If Azure variables are configured: **Azure Portal Blob Container** (`claimgpt`).
  - If Azure variables are empty: **MinIO Storage Console** [http://localhost:9001](http://localhost:9001) (User: `claimgpt` / Pass: `claimgpt123`).

