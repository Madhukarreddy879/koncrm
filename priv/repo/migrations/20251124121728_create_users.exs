defmodule EducationCrm.Repo.Migrations.CreateUsers do
  use Ecto.Migration

  def change do
    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :username, :string, null: false
      add :password_hash, :string, null: false
      add :role, :string, null: false
      add :branch_id, references(:branches, type: :binary_id, on_delete: :nothing)
      add :active, :boolean, default: true, null: false

      timestamps()
    end

    create unique_index(:users, [:username])
    create index(:users, [:branch_id])
    create constraint(:users, :role_must_be_valid, check: "role IN ('admin', 'telecaller')")
  end
end
