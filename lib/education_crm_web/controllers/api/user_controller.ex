defmodule EducationCrmWeb.Api.UserController do
  @moduledoc """
  API controller for user profile management.
  Handles retrieving current user details and personal statistics.
  """
  use EducationCrmWeb, :controller

  alias EducationCrm.Accounts
  alias EducationCrm.Repo

  plug EducationCrmWeb.Plugs.ApiAuth

  @doc """
  GET /api/me
  Gets the current authenticated user's profile details.

  Response (200):
    {
      "data": {
        "id": "uuid",
        "username": "string",
        "role": "string",
        "branch_id": "uuid",
        "branch_name": "string",
        "active": boolean,
        "inserted_at": "datetime",
        "updated_at": "datetime"
      }
    }
  """
  def me(conn, _params) do
    user = conn.assigns.current_user
    user_with_branch = Repo.preload(user, :branch)

    conn
    |> put_status(:ok)
    |> json(%{
      data: format_user(user_with_branch)
    })
  end

  @doc """
  GET /api/me/stats
  Gets personal performance statistics for the authenticated telecaller.

  Query parameters:
    - start_date: ISO8601 datetime (optional)
    - end_date: ISO8601 datetime (optional)

  Response (200):
    {
      "data": {
        "total_calls": integer,
        "connected_calls": integer,
        "total_leads": integer,
        "contacted_leads": integer,
        "enrolled_leads": integer,
        "conversion_rate": float,
        "period": {
          "start_date": "datetime",
          "end_date": "datetime"
        }
      }
    }
  """
  def stats(conn, params) do
    telecaller_id = conn.assigns.current_telecaller_id

    opts = []

    opts =
      case parse_datetime(params["start_date"]) do
        {:ok, datetime} -> Keyword.put(opts, :start_date, datetime)
        _ -> opts
      end

    opts =
      case parse_datetime(params["end_date"]) do
        {:ok, datetime} -> Keyword.put(opts, :end_date, datetime)
        _ -> opts
      end

    stats = Accounts.get_telecaller_stats(telecaller_id, opts)

    conn
    |> put_status(:ok)
    |> json(%{
      data: %{
        total_calls: stats.total_calls,
        connected_calls: stats.connected_calls,
        total_leads: stats.total_leads,
        contacted_leads: stats.contacted_leads,
        enrolled_leads: stats.enrolled_leads,
        conversion_rate: stats.conversion_rate,
        period: %{
          start_date: Keyword.get(opts, :start_date),
          end_date: Keyword.get(opts, :end_date)
        }
      }
    })
  end

  # Private helper functions

  defp format_user(user) do
    %{
      id: user.id,
      username: user.username,
      role: user.role,
      branch_id: user.branch_id,
      branch_name: user.branch && user.branch.name,
      active: user.active,
      inserted_at: user.inserted_at,
      updated_at: user.updated_at
    }
  end

  defp parse_datetime(nil), do: {:error, :invalid}
  defp parse_datetime(""), do: {:error, :invalid}

  defp parse_datetime(datetime_string) do
    case DateTime.from_iso8601(datetime_string) do
      {:ok, datetime, _offset} -> {:ok, datetime}
      _ -> {:error, :invalid}
    end
  end
end
