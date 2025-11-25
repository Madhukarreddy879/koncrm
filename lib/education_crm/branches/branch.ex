defmodule EducationCrm.Branches.Branch do
  @moduledoc """
  Schema for branch locations.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "branches" do
    field :name, :string
    field :location, :string
    field :active, :boolean, default: true

    has_many :users, EducationCrm.Accounts.User
    has_many :leads, EducationCrm.Leads.Lead

    timestamps()
  end

  @doc """
  Changeset for creating or updating a branch.
  """
  def changeset(branch, attrs) do
    branch
    |> cast(attrs, [:name, :location, :active])
    |> validate_required([:name, :location])
    |> validate_length(:name, min: 1, max: 255)
    |> validate_length(:location, min: 1, max: 255)
  end
end
