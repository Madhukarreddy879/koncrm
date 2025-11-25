defmodule EducationCrm.Imports.ImportLog do
  @moduledoc """
  Schema for CSV import audit logs.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "import_logs" do
    field :filename, :string
    field :total_rows, :integer
    field :successful_rows, :integer
    field :failed_rows, :integer
    field :error_details, :map

    belongs_to :branch, EducationCrm.Branches.Branch
    belongs_to :admin, EducationCrm.Accounts.User

    timestamps(updated_at: false)
  end

  @doc """
  Changeset for creating an import log.
  """
  def changeset(import_log, attrs) do
    import_log
    |> cast(attrs, [
      :filename,
      :total_rows,
      :successful_rows,
      :failed_rows,
      :error_details,
      :branch_id,
      :admin_id
    ])
    |> validate_required([
      :filename,
      :total_rows,
      :successful_rows,
      :failed_rows,
      :branch_id,
      :admin_id
    ])
    |> validate_length(:filename, max: 255)
    |> validate_number(:total_rows, greater_than_or_equal_to: 0)
    |> validate_number(:successful_rows, greater_than_or_equal_to: 0)
    |> validate_number(:failed_rows, greater_than_or_equal_to: 0)
    |> validate_row_counts()
    |> foreign_key_constraint(:branch_id)
    |> foreign_key_constraint(:admin_id)
  end

  defp validate_row_counts(changeset) do
    total = get_field(changeset, :total_rows)
    successful = get_field(changeset, :successful_rows)
    failed = get_field(changeset, :failed_rows)

    if total && successful && failed && total != successful + failed do
      add_error(changeset, :total_rows, "must equal successful_rows + failed_rows")
    else
      changeset
    end
  end
end
