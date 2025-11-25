defmodule EducationCrmWeb.Api.LeadController do
  @moduledoc """
  API controller for lead management endpoints.
  Handles listing, viewing, and updating leads for telecallers.
  """
  use EducationCrmWeb, :controller

  alias EducationCrm.Leads

  plug EducationCrmWeb.Plugs.ApiAuth

  @doc """
  GET /api/leads
  Lists leads assigned to the authenticated telecaller with pagination and filters.

  Query parameters:
    - status: Filter by lead status (optional)
    - search: Search by name or phone (optional)
    - page: Page number (default: 1)
    - per_page: Results per page (default: 50, max: 100)

  Response (200):
    {
      "data": [
        {
          "id": "uuid",
          "student_name": "string",
          "phone_number": "string",
          "email": "string",
          "status": "string",
          "city": "string",
          "preferred_course": "string",
          "preferred_university": "string",
          "alternate_phone": "string",
          "last_contacted_at": "datetime",
          "call_count": integer,
          "has_pending_followups": boolean,
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
    page = parse_int(params["page"], 1)
    per_page = min(parse_int(params["per_page"], 50), 100)

    opts = [
      telecaller_id: telecaller_id,
      page: page,
      per_page: per_page
    ]

    opts =
      opts
      |> maybe_add_filter(:status, params["status"])
      |> maybe_add_filter(:search, params["search"])

    leads = Leads.list_leads(opts)

    total =
      Leads.count_leads(
        telecaller_id: telecaller_id,
        status: params["status"],
        search: params["search"]
      )

    conn
    |> put_status(:ok)
    |> json(%{
      data: Enum.map(leads, &format_lead/1),
      meta: %{
        page: page,
        per_page: per_page,
        total: total
      }
    })
  end

  @doc """
  GET /api/leads/:id
  Gets a single lead with full history (notes, call logs, followups).

  Response (200):
    {
      "data": {
        "id": "uuid",
        "student_name": "string",
        "phone_number": "string",
        "email": "string",
        "status": "string",
        "city": "string",
        "preferred_course": "string",
        "preferred_university": "string",
        "alternate_phone": "string",
        "last_contacted_at": "datetime",
        "call_count": integer,
        "notes": [...],
        "call_logs": [...],
        "followups": [...],
        "inserted_at": "datetime",
        "updated_at": "datetime"
      }
    }

  Response (404):
    {
      "error": {
        "code": "NOT_FOUND",
        "message": "Lead not found"
      }
    }

  Response (403):
    {
      "error": {
        "code": "AUTHORIZATION_ERROR",
        "message": "You are not authorized to access this lead"
      }
    }
  """
  def show(conn, %{"id" => id}) do
    telecaller_id = conn.assigns.current_telecaller_id

    case Leads.get_lead_by(id: id) do
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
          conn
          |> put_status(:ok)
          |> json(%{
            data: format_lead_detail(lead)
          })
        else
          conn
          |> put_status(:forbidden)
          |> json(%{
            error: %{
              code: "AUTHORIZATION_ERROR",
              message: "You are not authorized to access this lead"
            }
          })
        end
    end
  end

  @doc """
  PATCH /api/leads/:id
  Updates a lead's telecaller-editable fields.

  Request body:
    {
      "email": "string",
      "alternate_phone": "string",
      "city": "string",
      "preferred_course": "string",
      "preferred_university": "string",
      "status": "string"
    }

  Response (200):
    {
      "data": {
        "id": "uuid",
        "student_name": "string",
        ...
      }
    }

  Response (422):
    {
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": {
          "field_name": ["error message"]
        }
      }
    }

  Response (403):
    {
      "error": {
        "code": "AUTHORIZATION_ERROR",
        "message": "You are not authorized to update this lead"
      }
    }
  """
  def update(conn, %{"id" => id} = params) do
    telecaller_id = conn.assigns.current_telecaller_id

    case Leads.get_lead_by(id: id) do
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
        update_attrs = extract_update_attrs(params)

        case Leads.update_lead(lead, update_attrs, telecaller_id) do
          {:ok, updated_lead} ->
            # Reload with associations
            updated_lead = Leads.get_lead_by(id: updated_lead.id)

            conn
            |> put_status(:ok)
            |> json(%{
              data: format_lead_detail(updated_lead)
            })

          {:error, :unauthorized} ->
            conn
            |> put_status(:forbidden)
            |> json(%{
              error: %{
                code: "AUTHORIZATION_ERROR",
                message: "You are not authorized to update this lead"
              }
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

  defp maybe_add_filter(opts, _key, nil), do: opts
  defp maybe_add_filter(opts, _key, ""), do: opts
  defp maybe_add_filter(opts, key, value), do: Keyword.put(opts, key, value)

  defp extract_update_attrs(params) do
    Map.take(params, [
      "email",
      "alternate_phone",
      "city",
      "preferred_course",
      "preferred_university",
      "status"
    ])
  end

  defp format_lead(lead) do
    %{
      id: lead.id,
      student_name: lead.student_name,
      phone_number: lead.phone_number,
      email: lead.email,
      status: lead.status,
      city: lead.city,
      preferred_course: lead.preferred_course,
      preferred_university: lead.preferred_university,
      alternate_phone: lead.alternate_phone,
      last_contacted_at: lead.last_contacted_at,
      call_count: lead.call_count,
      has_pending_followups: has_pending_followups?(lead),
      inserted_at: lead.inserted_at,
      updated_at: lead.updated_at
    }
  end

  defp format_lead_detail(lead) do
    %{
      id: lead.id,
      student_name: lead.student_name,
      phone_number: lead.phone_number,
      email: lead.email,
      status: lead.status,
      city: lead.city,
      preferred_course: lead.preferred_course,
      preferred_university: lead.preferred_university,
      alternate_phone: lead.alternate_phone,
      last_contacted_at: lead.last_contacted_at,
      call_count: lead.call_count,
      notes: Enum.map(lead.notes || [], &format_note/1),
      call_logs: Enum.map(lead.call_logs || [], &format_call_log/1),
      followups: Enum.map(lead.followups || [], &format_followup/1),
      inserted_at: lead.inserted_at,
      updated_at: lead.updated_at
    }
  end

  defp format_note(note) do
    %{
      id: note.id,
      note: note.note,
      inserted_at: note.inserted_at
    }
  end

  defp format_call_log(call_log) do
    %{
      id: call_log.id,
      outcome: call_log.outcome,
      duration_seconds: call_log.duration_seconds,
      recording_path: call_log.recording_path,
      inserted_at: call_log.inserted_at
    }
  end

  defp format_followup(followup) do
    %{
      id: followup.id,
      scheduled_at: followup.scheduled_at,
      description: followup.description,
      completed: followup.completed,
      completed_at: followup.completed_at,
      inserted_at: followup.inserted_at,
      updated_at: followup.updated_at
    }
  end

  defp has_pending_followups?(lead) do
    now = DateTime.utc_now()

    Enum.any?(lead.followups || [], fn followup ->
      not followup.completed and DateTime.compare(followup.scheduled_at, now) != :gt
    end)
  end

  defp format_changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
