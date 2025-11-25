# Oban Workers

This directory contains Oban workers for background job processing in the Education CRM system.

## Workers

### CsvImportWorker

Handles asynchronous CSV import processing. This worker:
- Parses and validates CSV files
- Distributes leads to telecallers using round-robin algorithm
- Creates leads in bulk
- Logs import results
- Cleans up temporary files

**Queue:** `csv_import` (5 concurrent jobs)

**Usage:**

```elixir
# Enqueue a CSV import job
EducationCrm.Workers.CsvImportWorker.enqueue(%{
  file_path: "/tmp/leads.csv",
  telecaller_ids: [tc1_id, tc2_id],
  branch_id: branch_id,
  admin_id: admin_id,
  filename: "leads.csv"
})
```

### RecordingProcessorWorker

Handles asynchronous call recording file processing. This worker:
- Finalizes chunked uploads
- Saves recording files to storage
- Attaches recordings to call logs
- Cleans up temporary files

**Queue:** `recordings` (3 concurrent jobs)

**Usage:**

```elixir
# Enqueue a chunked recording processing job
EducationCrm.Workers.RecordingProcessorWorker.enqueue_chunked(%{
  upload_id: "upload_session_id",
  expected_chunks: 5,
  call_log_id: call_log_id
})

# Enqueue a simple recording processing job
EducationCrm.Workers.RecordingProcessorWorker.enqueue_simple(%{
  temp_file_path: "/tmp/recording.aac",
  call_log_id: call_log_id,
  filename: "recording.aac"
})
```

## Configuration

Oban is configured in `config/config.exs`:

```elixir
config :education_crm, Oban,
  repo: EducationCrm.Repo,
  plugins: [Oban.Plugins.Pruner],
  queues: [default: 10, csv_import: 5, recordings: 3]
```

### Queue Settings

- `default`: 10 concurrent jobs - General purpose queue
- `csv_import`: 5 concurrent jobs - CSV import processing
- `recordings`: 3 concurrent jobs - Recording file processing

### Testing

In test environment, Oban is configured to run jobs inline:

```elixir
config :education_crm, Oban, testing: :inline
```

This means jobs are executed immediately in the test process, making tests deterministic.

## Monitoring

You can monitor Oban jobs through:

1. **Phoenix LiveDashboard** - Navigate to `/dev/dashboard` in development
2. **Oban Web UI** - Can be added as a separate dependency for production monitoring
3. **Database queries** - Jobs are stored in the `oban_jobs` table

## Error Handling

Both workers are configured with:
- **Max attempts:** 3
- **Automatic retries** with exponential backoff
- **Cancellation** for unrecoverable errors (e.g., missing resources)

Failed jobs can be inspected in the database and manually retried if needed.
