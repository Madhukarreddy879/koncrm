defmodule EducationCrm.Repo.Migrations.CreateBranches do
  use Ecto.Migration

  def change do
    create table(:branches, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :location, :string
      add :active, :boolean, default: true, null: false

      timestamps()
    end

    create index(:branches, [:active])
  end
end
