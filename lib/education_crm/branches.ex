defmodule EducationCrm.Branches do
  @moduledoc """
  The Branches context - manages branch locations.
  """

  import Ecto.Query, warn: false
  alias EducationCrm.Repo
  alias EducationCrm.Branches.Branch

  @doc """
  Creates a branch with the given attributes.
  Invalidates the branches cache on success.

  ## Examples

      iex> create_branch(%{name: "Hyderabad Main", location: "Banjara Hills"})
      {:ok, %Branch{}}

      iex> create_branch(%{name: ""})
      {:error, %Ecto.Changeset{}}

  """
  def create_branch(attrs \\ %{}) do
    result =
      %Branch{}
      |> Branch.changeset(attrs)
      |> Repo.insert()

    case result do
      {:ok, branch} ->
        invalidate_branches_cache()
        {:ok, branch}

      error ->
        error
    end
  end

  @doc """
  Updates a branch with the given attributes.
  Invalidates the branches cache on success.

  ## Examples

      iex> update_branch(branch, %{name: "Updated Name"})
      {:ok, %Branch{}}

      iex> update_branch(branch, %{name: ""})
      {:error, %Ecto.Changeset{}}

  """
  def update_branch(%Branch{} = branch, attrs) do
    result =
      branch
      |> Branch.changeset(attrs)
      |> Repo.update()

    case result do
      {:ok, branch} ->
        invalidate_branches_cache()
        {:ok, branch}

      error ->
        error
    end
  end

  @doc """
  Deactivates a branch (soft delete).
  Sets the active flag to false without deleting the record.
  Invalidates the branches cache on success.

  ## Examples

      iex> deactivate_branch(branch)
      {:ok, %Branch{active: false}}

  """
  def deactivate_branch(%Branch{} = branch) do
    result =
      branch
      |> Branch.changeset(%{active: false})
      |> Repo.update()

    case result do
      {:ok, branch} ->
        invalidate_branches_cache()
        {:ok, branch}

      error ->
        error
    end
  end

  # Private helper to invalidate branches cache
  defp invalidate_branches_cache do
    EducationCrm.Cache.delete(:branches_list)
  end

  @doc """
  Returns the list of active branches only.
  Results are cached for 1 hour (3600 seconds).

  ## Examples

      iex> list_branches()
      [%Branch{}, ...]

  """
  def list_branches do
    cache_key = :branches_list

    case EducationCrm.Cache.get(cache_key) do
      {:ok, branches} ->
        branches

      {:error, :not_found} ->
        branches =
          Branch
          |> where([b], b.active == true)
          |> order_by([b], asc: b.name)
          |> Repo.all()

        # Cache for 1 hour (3600 seconds)
        EducationCrm.Cache.put(cache_key, branches, 3600)
        branches
    end
  end

  @doc """
  Gets a single branch by ID.

  Raises `Ecto.NoResultsError` if the Branch does not exist.

  ## Examples

      iex> get_branch!(123)
      %Branch{}

      iex> get_branch!(456)
      ** (Ecto.NoResultsError)

  """
  def get_branch!(id), do: Repo.get!(Branch, id)

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking branch changes.

  ## Examples

      iex> change_branch(branch)
      %Ecto.Changeset{data: %Branch{}}

  """
  def change_branch(%Branch{} = branch, attrs \\ %{}) do
    Branch.changeset(branch, attrs)
  end
end
