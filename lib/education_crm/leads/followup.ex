defmodule EducationCrm.Leads.Followup do
  @moduledoc """
  Schema for follow-up tasks.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "followups" do
    field :scheduled_at, :utc_datetime
    field :description, :string
    field :completed, :boolean, default: false
    field :completed_at, :utc_datetime

    belongs_to :lead, EducationCrm.Leads.Lead
    belongs_to :telecaller, EducationCrm.Accounts.User

    timestamps()
  end

  @doc """
  Changeset for creating a follow-up.
  """
  def changeset(followup, attrs) do
    followup
    |> cast(attrs, [:scheduled_at, :description, :lead_id, :telecaller_id])
    |> validate_required([:scheduled_at, :lead_id, :telecaller_id])
    |> validate_length(:description, max: 1000)
    |> validate_future_date(:scheduled_at)
    |> foreign_key_constraint(:lead_id)
    |> foreign_key_constraint(:telecaller_id)
  end

  @doc """
  Changeset for completing a follow-up.
  """
  def complete_changeset(followup, attrs \\ %{}) do
    followup
    |> cast(attrs, [:completed, :completed_at])
    |> put_change(:completed, true)
    |> put_change(:completed_at, DateTime.utc_now() |> DateTime.truncate(:second))
  end

  defp validate_future_date(changeset, field) do
    case get_change(changeset, field) do
      nil ->
        changeset

      scheduled_at ->
        now = DateTime.utc_now()

        if DateTime.compare(scheduled_at, now) == :lt do
          add_error(changeset, field, "must be in the future")
        else
          changeset
        end
    end
  end
end
