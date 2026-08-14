# Backup and restore

Production PostgreSQL is managed externally. Enable the provider's encrypted
automated snapshots, point-in-time recovery, retention policy, and deletion
protection. The scripts here supplement those controls; they do not replace
them. Never test a restore against the live database.

## Logical backup

Install PostgreSQL client tools matching the server's major version. Export the
database variables from the protected operator environment without printing
them, then run:

```bash
export DATABASE_HOST=database.example
export DATABASE_PORT=5432
export DATABASE_NAME=scitrek
export DATABASE_USER=scitrek_backup
export DATABASE_PASSWORD='set-in-the-operator-secret-store'
export DATABASE_SSLMODE=require
BACKUP_DIR=/secure/backups scripts/backup_db.sh
```

The script creates a timestamped custom-format dump with owner-only default
permissions. Back up the private media volume separately while the deployment
is available:

```bash
COMPOSE_ENV_FILE=backend/scitrek_backend/.env \
  BACKUP_DIR=/secure/backups scripts/backup_media.sh
```

Encrypt and transfer both artifacts to access-controlled storage, apply a
retention policy, and monitor backup age. Database and media backups from one
recovery point must be retained and restored together.

## Restore drill

Create an empty disposable database with no production traffic or credentials.
Point the connection variables at that server, set the distinct restore target,
and confirm the name exactly:

```bash
export RESTORE_DATABASE_NAME=scitrek_restore_verify
export RESTORE_CONFIRM=scitrek_restore_verify
scripts/restore_db.sh /secure/backups/scitrek_YYYYMMDDTHHMMSSZ.dump
```

The script always refuses a target matching `DATABASE_NAME`. A live incident
restore must use the managed PostgreSQL provider's separately approved recovery
runbook and change controls, not this verification helper.

After restoration, run Django checks against the disposable database, compare
key table counts with the backup source, verify representative teacher/student
relationships, and confirm uploaded-media references have corresponding files.
Record the date, duration, backup identifier, checks, and operator. Perform this
drill regularly and after material schema/storage changes.

For a media drill, create a new empty `media-data` volume in an isolated
Compose project, stop its web/worker services, then run:

```bash
export MEDIA_RESTORE_CONFIRM=restore-empty-media-data
COMPOSE_ENV_FILE=backend/scitrek_backend/.env \
  scripts/restore_media.sh /secure/backups/scitrek_media_YYYYMMDDTHHMMSSZ.tar.gz
```

The helper refuses a running web/worker or a non-empty media volume. Compare a
recorded file count and checksums, then verify representative database file
references through the authenticated download APIs. The database restore drill
was executed locally; the media drill requires the deployment's named volume
and remains an operator acceptance check before enabling real uploads.
