defmodule EducationCrm.Repo.Migrations.CreateSupportingTables do
  use Ecto.Migration

  def change do
    # Lead Notes table
    create table(:lead_notes, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :lead_id, references(:leads, type: :binary_id, on_delete: :delete_all), null: false
      add :telecaller_id, references(:users, type: :binary_id, on_delete: :nothing), null: false
      add :note, :text, null: false

      timestamps(updated_at: false)
    end

    create index(:lead_notes, [:lead_id])

    # Call Logs table
    create table(:call_logs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :lead_id, references(:leads, type: :binary_id, on_delete: :delete_all), null: false
      add :telecaller_id, references(:users, type: :binary_id, on_delete: :nothing), null: false
      add :outcome, :string, null: false
      add :duration_seconds, :integer
      add :recording_path, :string

      timestamps(updated_at: false)
    end

    create index(:call_logs, [:lead_id])
    create index(:call_logs, [:telecaller_id, :inserted_at])

    create constraint(:call_logs, :outcome_must_be_valid,
             check: "outcome IN ('connected', 'no_answer', 'busy', 'invalid_number')"
           )

    # Follow-ups table
    create table(:followups, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :lead_id, references(:leads, type: :binary_id, on_delete: :delete_all), null: false
      add :telecaller_id, references(:users, type: :binary_id, on_delete: :nothing), null: false
      add :scheduled_at, :utc_datetime, null: false
      add :description, :text
      add :completed, :boolean, default: false, null: false
      add :completed_at, :utc_datetime

      timestamps()
    end

    create index(:followups, [:lead_id])
    create index(:followups, [:telecaller_id, :scheduled_at], where: "completed = false")

    # Import Logs table
    create table(:import_logs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :branch_id, references(:branches, type: :binary_id, on_delete: :nothing), null: false
      add :admin_id, references(:users, type: :binary_id, on_delete: :nothing), null: false
      add :filename, :string, null: false
      add :total_rows, :integer, null: false
      add :successful_rows, :integer, null: false
      add :failed_rows, :integer, null: false
      add :error_details, :map

      timestamps(updated_at: false)
    end

    create index(:import_logs, [:branch_id, :inserted_at])
  end
end
