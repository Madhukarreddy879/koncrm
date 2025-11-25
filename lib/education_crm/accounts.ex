defmodule EducationCrm.Accounts do
  @moduledoc """
  The Accounts context - manages users and authentication.
  """

  import Ecto.Query, warn: false
  alias EducationCrm.Repo
  alias EducationCrm.Accounts.User
  alias EducationCrm.Guardian
  alias EducationCrm.Leads.Lead
  alias EducationCrm.Leads.CallLog

  @doc """
  Gets a single user by ID.
  """
  def get_user(id) do
    Repo.get(User, id)
  end

  @doc """
  Gets a single user by username.
  """
  def get_user_by_username(username) do
    Repo.get_by(User, username: username, active: true)
  end

  @doc """
  Authenticates a user with username and password.
  Returns {:ok, token, refresh_token} on success, {:error, reason} on failure.
  """
  def authenticate(username, password) when is_binary(username) and is_binary(password) do
    with %User{} = user <- get_user_by_username(username),
         true <- user.active,
         true <- Argon2.verify_pass(password, user.password_hash) do
      generate_tokens(user)
    else
      nil ->
        # Run password hash to prevent timing attacks
        Argon2.no_user_verify()
        {:error, :invalid_credentials}

      false ->
        {:error, :invalid_credentials}
    end
  end

  def authenticate(_username, _password) do
    {:error, :invalid_credentials}
  end

  @doc """
  Generates JWT access token and refresh token for a user.
  Access token expires in 15 minutes, refresh token expires in 7 days.
  """
  def generate_tokens(user) do
    with {:ok, access_token, _claims} <-
           Guardian.encode_and_sign(user, %{}, ttl: {15, :minutes}, token_type: "access"),
         {:ok, refresh_token, _claims} <-
           Guardian.encode_and_sign(user, %{}, ttl: {7, :days}, token_type: "refresh") do
      {:ok, access_token, refresh_token}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Refreshes an access token using a valid refresh token.
  Returns {:ok, new_access_token, new_refresh_token} on success.
  """
  def refresh_token(refresh_token) when is_binary(refresh_token) do
    with {:ok, _old_stuff, {token, claims}} <-
           Guardian.exchange(refresh_token, "refresh", "access", ttl: {15, :minutes}),
         {:ok, user} <- Guardian.resource_from_claims(claims),
         {:ok, new_refresh_token, _claims} <-
           Guardian.encode_and_sign(user, %{}, ttl: {7, :days}, token_type: "refresh") do
      {:ok, token, new_refresh_token}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  def refresh_token(_), do: {:error, :invalid_token}

  @doc """
  Verifies a JWT token and returns the associated user.
  Returns {:ok, user} on success, {:error, reason} on failure.
  """
  def verify_token(token) when is_binary(token) do
    with {:ok, claims} <- Guardian.decode_and_verify(token),
         {:ok, user} <- Guardian.resource_from_claims(claims) do
      {:ok, user}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  def verify_token(_), do: {:error, :invalid_token}

  @doc """
  Revokes a JWT token (logout).
  Returns {:ok, claims} on success, {:error, reason} on failure.
  """
  def revoke_token(token) when is_binary(token) do
    with {:ok, claims} <- Guardian.decode_and_verify(token),
         {:ok, _claims} <- Guardian.revoke(token) do
      {:ok, claims}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  def revoke_token(_), do: {:error, :invalid_token}

  @doc """
  Creates a telecaller account with branch assignment.
  Returns {:ok, user} on success, {:error, changeset} on failure.
  Invalidates the telecaller cache for the branch on success.
  """
  def create_telecaller(attrs, branch_id) do
    attrs_with_branch =
      attrs
      |> Map.put("branch_id", branch_id)
      |> Map.put("role", "telecaller")

    result =
      %User{}
      |> User.changeset(attrs_with_branch)
      |> Repo.insert()

    case result do
      {:ok, user} ->
        invalidate_telecaller_cache(branch_id)
        {:ok, user}

      error ->
        error
    end
  end

  @doc """
  Lists telecallers with lead count aggregation.
  Accepts optional filters: branch_id, active status.
  Returns list of telecallers with lead_count field.
  Results are cached per branch for 1 hour (3600 seconds).
  """
  def list_telecallers(filters \\ %{}) do
    branch_id = Map.get(filters, :branch_id)
    active = Map.get(filters, :active, true)

    # Only cache if filtering by branch_id and active status
    cache_key =
      if branch_id && is_boolean(active) do
        {:telecallers_list, branch_id, active}
      else
        nil
      end

    if cache_key do
      case EducationCrm.Cache.get(cache_key) do
        {:ok, telecallers} ->
          telecallers

        {:error, :not_found} ->
          telecallers = fetch_telecallers(filters)
          # Cache for 1 hour (3600 seconds)
          EducationCrm.Cache.put(cache_key, telecallers, 3600)
          telecallers
      end
    else
      fetch_telecallers(filters)
    end
  end

  defp fetch_telecallers(filters) do
    query =
      from u in User,
        left_join: l in assoc(u, :leads),
        where: u.role == "telecaller",
        group_by: u.id,
        select: %{
          id: u.id,
          username: u.username,
          role: u.role,
          branch_id: u.branch_id,
          active: u.active,
          inserted_at: u.inserted_at,
          updated_at: u.updated_at,
          lead_count: count(l.id)
        }

    query
    |> apply_telecaller_filters(filters)
    |> Repo.all()
  end

  defp apply_telecaller_filters(query, filters) do
    Enum.reduce(filters, query, fn
      {:branch_id, branch_id}, query when not is_nil(branch_id) ->
        from u in query, where: u.branch_id == ^branch_id

      {:active, active}, query when is_boolean(active) ->
        from u in query, where: u.active == ^active

      _, query ->
        query
    end)
  end

  @doc """
  Deactivates a telecaller account (soft delete).
  Returns {:ok, user} on success, {:error, changeset} on failure.
  Invalidates the telecaller cache for the branch on success.
  """
  def deactivate_telecaller(id) do
    case Repo.get(User, id) do
      nil ->
        {:error, :not_found}

      user ->
        result =
          user
          |> User.update_changeset(%{active: false})
          |> Repo.update()

        case result do
          {:ok, updated_user} ->
            invalidate_telecaller_cache(updated_user.branch_id)
            {:ok, updated_user}

          error ->
            error
        end
    end
  end

  # Private helper to invalidate telecaller cache for a branch
  defp invalidate_telecaller_cache(branch_id) do
    # Invalidate both active and inactive caches
    EducationCrm.Cache.delete({:telecallers_list, branch_id, true})
    EducationCrm.Cache.delete({:telecallers_list, branch_id, false})
  end

  @doc """
  Gets telecaller statistics with date range filtering.
  Returns a map with call counts and conversion metrics.

  Options:
    - :start_date - Start date for filtering (DateTime)
    - :end_date - End date for filtering (DateTime)

  Returns:
    %{
      total_calls: integer,
      connected_calls: integer,
      total_leads: integer,
      contacted_leads: integer,
      enrolled_leads: integer,
      conversion_rate: float
    }
  """
  def get_telecaller_stats(telecaller_id, opts \\ []) do
    start_date = Keyword.get(opts, :start_date)
    end_date = Keyword.get(opts, :end_date)

    # Get call statistics
    call_stats_query =
      from c in CallLog,
        where: c.telecaller_id == ^telecaller_id

    call_stats_query =
      if start_date do
        from c in call_stats_query, where: c.inserted_at >= ^start_date
      else
        call_stats_query
      end

    call_stats_query =
      if end_date do
        from c in call_stats_query, where: c.inserted_at <= ^end_date
      else
        call_stats_query
      end

    call_stats =
      from c in call_stats_query,
        select: %{
          total_calls: count(c.id),
          connected_calls: fragment("COUNT(CASE WHEN ? = 'connected' THEN 1 END)", c.outcome)
        }

    call_results = Repo.one(call_stats) || %{total_calls: 0, connected_calls: 0}

    # Get lead statistics
    lead_stats_query =
      from l in Lead,
        where: l.telecaller_id == ^telecaller_id

    lead_stats =
      from l in lead_stats_query,
        select: %{
          total_leads: count(l.id),
          contacted_leads:
            fragment(
              "COUNT(CASE WHEN ? IN ('contacted', 'interested', 'not_interested', 'enrolled', 'lost') THEN 1 END)",
              l.status
            ),
          enrolled_leads: fragment("COUNT(CASE WHEN ? = 'enrolled' THEN 1 END)", l.status)
        }

    lead_results =
      Repo.one(lead_stats) || %{total_leads: 0, contacted_leads: 0, enrolled_leads: 0}

    # Calculate conversion rate
    conversion_rate =
      if lead_results.contacted_leads > 0 do
        Float.round(lead_results.enrolled_leads / lead_results.contacted_leads * 100, 2)
      else
        0.0
      end

    %{
      total_calls: call_results.total_calls,
      connected_calls: call_results.connected_calls,
      total_leads: lead_results.total_leads,
      contacted_leads: lead_results.contacted_leads,
      enrolled_leads: lead_results.enrolled_leads,
      conversion_rate: conversion_rate
    }
  end
end
