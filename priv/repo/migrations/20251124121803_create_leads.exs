defmodule EducationCrm.Repo.Migrations.CreateLeads do
  use Ecto.Migration

  def change do
    create table(:leads, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :student_name, :string, null: false
      add :phone_number, :string, null: false
      add :email, :string
      add :alternate_phone, :string
      add :city, :string
      add :preferred_course, :string
      add :preferred_university, :string
      add :status, :string, default: "new", null: false
      add :telecaller_id, references(:users, type: :binary_id, on_delete: :nothing)
      add :branch_id, references(:branches, type: :binary_id, on_delete: :nothing), null: false
      add :assigned_at, :utc_datetime
      add :last_contacted_at, :utc_datetime
      add :call_count, :integer, default: 0, null: false

      timestamps()
    end

    create index(:leads, [:telecaller_id])
    create index(:leads, [:branch_id])
    create index(:leads, [:status])
    create index(:leads, [:phone_number])

    create constraint(:leads, :status_must_be_valid,
             check:
               "status IN ('new', 'contacted', 'interested', 'not_interested', 'enrolled', 'lost')"
           )
  end
end
