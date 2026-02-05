# Database Troubleshooting Guide

This guide helps resolve PostgreSQL container issues when running the StoneyOneBurn marketplace.

## Quick Fixes

### Container exists but is stopped (Exited 255)

**Option 1: Recreate container (keeps your data)**

```powershell
.\scripts\troubleshoot-database.ps1 -Repair
```

This removes the container and recreates it using `docker-compose`. Your database data (in the `postgres_db_data` volume) is preserved.

**Option 2: Full reset (deletes all data)**

If the repair fails or you need a clean slate:

```powershell
.\scripts\troubleshoot-database.ps1 -Reset
```

⚠️ **Warning:** This deletes the `postgres_db_data` volume. All database content will be lost. You will need to run migrations again.

### Container won't start

1. **Check Docker Desktop** – Ensure Docker Desktop is running and fully started (whale icon in system tray).

2. **View logs** to see the error:
   ```powershell
   docker logs postgres_db
   ```

3. **Run the troubleshooting script** for diagnosis:
   ```powershell
   .\scripts\troubleshoot-database.ps1
   ```

## Common Causes of Exit 255

| Cause | Solution |
|-------|----------|
| **Corrupted data** | Unclean shutdown left the data directory in a bad state. Run `-Repair` to recreate the container. |
| **Lock file** | `postmaster.pid` was left behind. `-Repair` creates a fresh container. |
| **Docker memory** | Increase Docker Desktop memory (Settings → Resources → Memory). |
| **Volume permissions** | On Windows, WSL2 volume mounts can have permission issues. Try `-Reset` if `-Repair` fails. |
| **Port conflict** | Another process is using port 6543. Stop it or change the port in `docker-compose.yml`. |

## Manual Commands

```powershell
# Start the container
docker start postgres_db

# Stop the container
docker stop postgres_db

# View logs (follow mode)
docker logs -f postgres_db

# Remove container only (data preserved in volume)
docker stop postgres_db
docker rm postgres_db

# Recreate with docker-compose
docker-compose up -d postgres_db

# Remove volume (data loss)
docker volume rm postgres_db_data
```

## Connection Details

- **Host:** localhost
- **Port:** 6543 (mapped from container's 5432)
- **Database:** vendure
- **User:** postgres
- **Password:** postgres

## After Repair

1. Run `.\start-database.ps1` to verify the database is accepting connections.
2. If you used `-Reset`, run migrations: `npm run migration:run` (or your project's migration command).
3. Start the app: `npm run dev`.

## Integration Tests: Admin Login Fails

If order-splitting (or other) integration tests fail with `Admin login failed: INVALID_CREDENTIALS_ERROR`:

1. **Try credential order:** The test tries `INTEGRATION_TEST_ADMIN_*` and `SUPERADMIN_*` from `.env`, then `superadmin/changeme`, `superadmin/superadmin`, and `test-admin/test-password-123`. Use whichever matches your DB.

2. **Fresh DB:** If you used `-Reset` and restarted the app, the superadmin is created from `.env` (`SUPERADMIN_USERNAME`, `SUPERADMIN_PASSWORD`). Set these in `.env` and add matching `INTEGRATION_TEST_ADMIN_USERNAME` / `INTEGRATION_TEST_ADMIN_PASSWORD` for the tests.

3. **Existing DB:** The superadmin password is set only when the database is first initialized. Changing `.env` and restarting does not update it. Either use the original credentials, or reset the password (e.g. via a DB script or Vendure `AdministratorService`).
