defmodule EducationCrm.Leads.CallLog do
  @moduledoc """
  Schema for call logs and recordings.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @valid_outcomes ~w(connected no_answer busy invalid_number)

  schema "call_logs" do
    field :outcome, :string
    field :duration_seconds, :integer
    field :recording_path, :string

    belongs_to :lead, EducationCrm.Leads.Lead
    belongs_to :telecaller, EducationCrm.Accounts.User

    timestamps(updated_at: false)
  end

  @doc """
  Changeset for creating a call log.
  """
  def changeset(call_log, attrs) do
    call_log
    |> cast(attrs, [:outcome, :duration_seconds, :recording_path, :lead_id, :telecaller_id])
    |> validate_required([:outcome, :lead_id, :telecaller_id])
    |> validate_inclusion(:outcome, @valid_outcomes)
    |> validate_number(:duration_seconds, greater_than_or_equal_to: 0)
    |> validate_length(:recording_path, max: 500)
    |> foreign_key_constraint(:lead_id)
    |> foreign_key_constraint(:telecaller_id)
  end
end
