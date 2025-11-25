defmodule EducationCrm.Leads.Lead do
  @moduledoc """
  Schema for student leads.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @valid_statuses ~w(new contacted interested not_interested enrolled lost)

  schema "leads" do
    field :student_name, :string
    field :phone_number, :string
    field :email, :string
    field :preferred_course, :string
    field :preferred_university, :string
    field :alternate_phone, :string
    field :city, :string
    field :status, :string, default: "new"
    field :assigned_at, :utc_datetime
    field :last_contacted_at, :utc_datetime
    field :call_count, :integer, default: 0

    belongs_to :telecaller, EducationCrm.Accounts.User
    belongs_to :branch, EducationCrm.Branches.Branch

    has_many :notes, EducationCrm.Leads.LeadNote
    has_many :call_logs, EducationCrm.Leads.CallLog
    has_many :followups, EducationCrm.Leads.Followup

    timestamps()
  end

  @doc """
  Changeset for CSV import - only requires name and phone.
  """
  def csv_import_changeset(lead, attrs) do
    lead
    |> cast(attrs, [:student_name, :phone_number, :branch_id, :telecaller_id, :assigned_at])
    |> validate_required([:student_name, :phone_number, :branch_id])
    |> validate_length(:student_name, min: 1, max: 255)
    |> validate_phone_number(:phone_number)
    |> put_change(:status, "new")
  end

  @doc """
  Changeset for telecaller updates - allows updating all editable fields.
  """
  def telecaller_update_changeset(lead, attrs) do
    lead
    |> cast(attrs, [
      :email,
      :alternate_phone,
      :city,
      :preferred_course,
      :preferred_university,
      :status,
      :last_contacted_at,
      :call_count
    ])
    |> validate_email(:email)
    |> validate_phone_number(:alternate_phone)
    |> validate_length(:city, max: 100)
    |> validate_length(:preferred_course, max: 255)
    |> validate_length(:preferred_university, max: 255)
    |> validate_inclusion(:status, @valid_statuses)
  end

  @doc """
  Changeset for full lead creation (used internally).
  """
  def changeset(lead, attrs) do
    lead
    |> cast(attrs, [
      :student_name,
      :phone_number,
      :email,
      :preferred_course,
      :preferred_university,
      :alternate_phone,
      :city,
      :status,
      :telecaller_id,
      :branch_id,
      :assigned_at,
      :last_contacted_at,
      :call_count
    ])
    |> validate_required([:student_name, :phone_number, :branch_id])
    |> validate_length(:student_name, min: 1, max: 255)
    |> validate_phone_number(:phone_number)
    |> validate_email(:email)
    |> validate_phone_number(:alternate_phone)
    |> validate_length(:city, max: 100)
    |> validate_length(:preferred_course, max: 255)
    |> validate_length(:preferred_university, max: 255)
    |> validate_inclusion(:status, @valid_statuses)
  end

  defp validate_phone_number(changeset, field) do
    changeset
    |> validate_length(field, max: 20)
    |> validate_format(field, ~r/^[0-9+\-\s()]+$/,
      message: "must contain only numbers, spaces, and phone formatting characters"
    )
  end

  defp validate_email(changeset, field) do
    changeset
    |> validate_length(field, max: 255)
    |> validate_format(field, ~r/^[^\s]+@[^\s]+\.[^\s]+$/,
      message: "must be a valid email address"
    )
  end
end
