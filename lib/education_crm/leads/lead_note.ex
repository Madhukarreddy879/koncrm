defmodule EducationCrm.Leads.LeadNote do
  @moduledoc """
  Schema for lead notes and interaction history.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "lead_notes" do
    field :note, :string

    belongs_to :lead, EducationCrm.Leads.Lead
    belongs_to :telecaller, EducationCrm.Accounts.User

    timestamps(updated_at: false)
  end

  @doc """
  Changeset for creating a lead note.
  """
  def changeset(lead_note, attrs) do
    lead_note
    |> cast(attrs, [:note, :lead_id, :telecaller_id])
    |> validate_required([:note, :lead_id, :telecaller_id])
    |> validate_length(:note, min: 1)
    |> foreign_key_constraint(:lead_id)
    |> foreign_key_constraint(:telecaller_id)
  end
end
