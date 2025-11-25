defmodule EducationCrmWeb.Api.FollowupController do
  @moduledoc """
  API controller for follow-up management.
  Handles listing, creating, and completing follow-up tasks.
  """
  use EducationCrmWeb, :controller

  alias EducationCrm.Followups
  alias EducationCrm.Leads
  alias EducationCrm.Repo

  plug EducationCrmWeb.Plugs.ApiAuth

  @doc """
  GET /api/followups
  Lists follow-ups for the authenticated telecaller with pagination.

  Query parameters:
    - due_only: "true" to show only due/overdue followups (default: false)
    - completed: "true" or "false" to filter by completion status (optional)
    - page: Page number (default: 1)
    - per_page: Results per page (default: 50, max: 100)

  Response (200):
    {
      "data": [
        {
          "id": "uuid",
          "lead_id": "uuid",
          "lead_name": "string",
          "lead_phone": "string",
          "scheduled_at": "datetime",
          "description": "string",
          "completed": boolean,
          "completed_at": "datetime",
          "is_overdue": boolean,
          "inserted_at": "datetime",
          "updated_at": "datetime"
        }
      ],
      "meta": {
        "page": integer,
        "per_page": integer,
        "total": integer
      }
    }
  """
  def index(conn, params) do
    telecaller_id = conn.assigns.current_telecaller_id
    due_only = params["due_only"] == "true"

    if due_only do
      # For due_only, return unpaginated list (typically small)
      followups = Followups.list_due_followups(telecaller_id)

      conn
      |> put_status(:ok)
      |> json(%{
        data: Enum.map(followups, &format_followup/1)
      })
    else
      # For all followups, use pagination
      page = parse_int(params["page"], 1)
      per_page = min(parse_int(params["per_page"], 50), 100)

      completed =
        case params["completed"] do
          "true" -> true
          "false" -> false
          _ -> nil
        end

      opts = [
        telecaller_id: telecaller_id,
        page: page,
        per_page: per_page
      ]

      opts =
        if completed != nil do
          Keyword.put(opts, :completed, completed)
        else
          opts
        end

      followups = Followups.list_followups(opts)

      total =
        Followups.count_followups(
          telecaller_id: telecaller_id,
          completed: completed
        )

      conn
      |> put_status(:ok)
      |> json(%{
        data: Enum.map(followups, &format_followup/1),
        meta: %{
          page: page,
          per_page: per_page,
          total: total
        }
      })
    end
  end

  @doc """
  POST /api/followups
  Creates a new follow-up task for a lead.

  Request body:
    {
      "lead_id": "uuid",
      "scheduled_at": "datetime",
      "description": "string"
    }

  Response (201):
    {
      "data": {
        "id": "uuid",
        "lead_id": "uuid",
        "scheduled_at": "datetime",
        "description": "string",
        "completed": false,
        "completed_at": null,
        "inserted_at": "datetime",
        "updated_at": "datetime"
      }
    }

  Response (422):
    {
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": {...}
      }
    }

  Response (403):
    {
      "error": {
        "code": "AUTHORIZATION_ERROR",
        "message": "You are not authorized to create follow-ups for this lead"
      }
    }
  """
  def create(conn, params) do
    telecaller_id = conn.assigns.current_telecaller_id
    lead_id = params["lead_id"]

    # Verify lead belongs to telecaller
    case Leads.get_lead_by(id: lead_id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{
          error: %{
            code: "NOT_FOUND",
            message: "Lead not found"
          }
        })

      lead ->
        if lead.telecaller_id == telecaller_id do
          followup_attrs = extract_followup_attrs(params)

          case Followups.create_followup(lead_id, followup_attrs, telecaller_id) do
            {:ok, followup} ->
              # Reload with associations
              followup = Repo.preload(followup, [:lead])

              conn
              |> put_status(:created)
              |> json(%{
                data: format_followup(followup)
              })

            {:error, %Ecto.Changeset{} = changeset} ->
              conn
              |> put_status(:unprocessable_entity)
              |> json(%{
                error: %{
                  code: "VALIDATION_ERROR",
                  message: "Validation failed",
                  details: format_changeset_errors(changeset)
                }
              })
          end
        else
          conn
          |> put_status(:forbidden)
          |> json(%{
            error: %{
              code: "AUTHORIZATION_ERROR",
              message: "You are not authorized to create follow-ups for this lead"
            }
          })
        end
    end
  end

  @doc """
  PATCH /api/followups/:id
  Marks a follow-up as completed.

  Response (200):
    {
      "data": {
        "id": "uuid",
        "completed": true,
        "completed_at": "datetime",
        ...
      }
    }

  Response (404):
    {
      "error": {
        "code": "NOT_FOUND",
        "message": "Follow-up not found"
      }
    }

  Response (403):
    {
      "error": {
        "code": "AUTHORIZATION_ERROR",
        "message": "You are not authorized to update this follow-up"
      }
    }
  """
  def update(conn, %{"id" => id}) do
    telecaller_id = conn.assigns.current_telecaller_id

    # Get followup and verify ownership
    case get_followup_with_auth(id, telecaller_id) do
      {:ok, _followup} ->
        case Followups.complete_followup(id) do
          {:ok, updated_followup} ->
            # Reload with associations
            updated_followup = Repo.preload(updated_followup, [:lead])

            conn
            |> put_status(:ok)
            |> json(%{
              data: format_followup(updated_followup)
            })

          {:error, :not_found} ->
            conn
            |> put_status(:not_found)
            |> json(%{
              error: %{
                code: "NOT_FOUND",
                message: "Follow-up not found"
              }
            })

          {:error, %Ecto.Changeset{} = changeset} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{
              error: %{
                code: "VALIDATION_ERROR",
                message: "Failed to complete follow-up",
                details: format_changeset_errors(changeset)
              }
            })
        end

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{
          error: %{
            code: "NOT_FOUND",
            message: "Follow-up not found"
          }
        })

      {:error, :unauthorized} ->
        conn
        |> put_status(:forbidden)
        |> json(%{
          error: %{
            code: "AUTHORIZATION_ERROR",
            message: "You are not authorized to update this follow-up"
          }
        })
    end
  end

  # Private helper functions

  defp parse_int(nil, default), do: default

  defp parse_int(value, default) when is_binary(value) do
    case Integer.parse(value) do
      {int, _} -> int
      :error -> default
    end
  end

  defp parse_int(value, _default) when is_integer(value), do: value

  defp get_followup_with_auth(id, telecaller_id) do
    alias EducationCrm.Leads.Followup

    case Repo.get(Followup, id) do
      nil ->
        {:error, :not_found}

      followup ->
        if followup.telecaller_id == telecaller_id do
          {:ok, followup}
        else
          {:error, :unauthorized}
        end
    end
  end

  defp extract_followup_attrs(params) do
    attrs = %{}

    attrs =
      if params["scheduled_at"] do
        case DateTime.from_iso8601(params["scheduled_at"]) do
          {:ok, datetime, _offset} -> Map.put(attrs, :scheduled_at, datetime)
          _ -> attrs
        end
      else
        attrs
      end

    attrs =
      if params["description"] do
        Map.put(attrs, :description, params["description"])
      else
        attrs
      end

    attrs
  end

  defp format_followup(followup) do
    now = DateTime.utc_now()
    is_overdue = not followup.completed and DateTime.compare(followup.scheduled_at, now) == :lt

    %{
      id: followup.id,
      lead_id: followup.lead_id,
      lead_name: followup.lead && followup.lead.student_name,
      lead_phone: followup.lead && followup.lead.phone_number,
      scheduled_at: followup.scheduled_at,
      description: followup.description,
      completed: followup.completed,
      completed_at: followup.completed_at,
      is_overdue: is_overdue,
      inserted_at: followup.inserted_at,
      updated_at: followup.updated_at
    }
  end

  defp format_changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
