defmodule EducationCrm.Accounts.User do
  @moduledoc """
  Schema for users (admins and telecallers).
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @valid_roles ~w(admin telecaller)

  schema "users" do
    field :username, :string
    field :password, :string, virtual: true
    field :password_hash, :string
    field :role, :string
    field :active, :boolean, default: true

    belongs_to :branch, EducationCrm.Branches.Branch

    has_many :leads, EducationCrm.Leads.Lead, foreign_key: :telecaller_id
    has_many :lead_notes, EducationCrm.Leads.LeadNote, foreign_key: :telecaller_id
    has_many :call_logs, EducationCrm.Leads.CallLog, foreign_key: :telecaller_id
    has_many :followups, EducationCrm.Leads.Followup, foreign_key: :telecaller_id

    timestamps()
  end

  @doc """
  Changeset for creating a new user with password hashing.
  """
  def changeset(user, attrs) do
    user
    |> cast(attrs, [:username, :password, :role, :branch_id, :active])
    |> validate_required([:username, :password, :role])
    |> validate_length(:username, min: 3, max: 100)
    |> validate_length(:password, min: 8, max: 100)
    |> validate_inclusion(:role, @valid_roles)
    |> validate_branch_for_telecaller()
    |> unique_constraint(:username)
    |> hash_password()
  end

  @doc """
  Changeset for updating a user without requiring password.
  """
  def update_changeset(user, attrs) do
    user
    |> cast(attrs, [:username, :role, :branch_id, :active])
    |> validate_required([:username, :role])
    |> validate_length(:username, min: 3, max: 100)
    |> validate_inclusion(:role, @valid_roles)
    |> validate_branch_for_telecaller()
    |> unique_constraint(:username)
  end

  @doc """
  Changeset for updating password.
  """
  def password_changeset(user, attrs) do
    user
    |> cast(attrs, [:password])
    |> validate_required([:password])
    |> validate_length(:password, min: 8, max: 100)
    |> hash_password()
  end

  defp validate_branch_for_telecaller(changeset) do
    role = get_field(changeset, :role)
    branch_id = get_field(changeset, :branch_id)

    if role == "telecaller" and is_nil(branch_id) do
      add_error(changeset, :branch_id, "must be set for telecaller role")
    else
      changeset
    end
  end

  defp hash_password(changeset) do
    case get_change(changeset, :password) do
      nil ->
        changeset

      password ->
        changeset
        |> put_change(:password_hash, Argon2.hash_pwd_salt(password))
        |> delete_change(:password)
    end
  end
end
