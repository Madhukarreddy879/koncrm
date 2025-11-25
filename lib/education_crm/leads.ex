defmodule EducationCrm.Leads do
  @moduledoc """
  The Leads context - manages student leads and interactions.
  """

  import Ecto.Query, warn: false
  alias EducationCrm.Repo
  alias EducationCrm.Leads.{Lead, LeadNote, CallLog}

  @doc """
  Creates a single lead.

  ## Examples

      iex> create_lead(%{student_name: "John Doe", phone_number: "1234567890"}, telecaller_id)
      {:ok, %Lead{}}

      iex> create_lead(%{}, telecaller_id)
      {:error, %Ecto.Changeset{}}

  """
  def create_lead(attrs, telecaller_id) do
    attrs_with_telecaller =
      attrs
      |> Map.put(:telecaller_id, telecaller_id)
      |> Map.put(:assigned_at, DateTime.utc_now())

    %Lead{}
    |> Lead.changeset(attrs_with_telecaller)
    |> Repo.insert()
  end

  @doc """
  Gets a single lead with preloaded associations.

  Raises `Ecto.NoResultsError` if the Lead does not exist.

  ## Examples

      iex> get_lead(123)
      %Lead{notes: [...], call_logs: [...], followups: [...]}

      iex> get_lead(456)
      ** (Ecto.NoResultsError)

  """
  def get_lead(id) do
    Lead
    |> preload([:notes, :call_logs, :followups, :telecaller, :branch])
    |> Repo.get!(id)
  end

  @doc """
  Gets a single lead with preloaded associations, returns nil if not found.

  ## Examples

      iex> get_lead_by(id: 123)
      %Lead{}

      iex> get_lead_by(id: 456)
      nil

  """
  def get_lead_by(clauses) do
    Lead
    |> preload([:notes, :call_logs, :followups, :telecaller, :branch])
    |> Repo.get_by(clauses)
  end

  @doc """
  Updates a lead with telecaller-editable fields.

  Validates that the telecaller owns the lead before updating.

  ## Examples

      iex> update_lead(lead, %{email: "new@example.com"}, telecaller_id)
      {:ok, %Lead{}}

      iex> update_lead(lead, %{email: "invalid"}, telecaller_id)
      {:error, %Ecto.Changeset{}}

      iex> update_lead(lead, %{}, wrong_telecaller_id)
      {:error, :unauthorized}

  """
  def update_lead(%Lead{telecaller_id: telecaller_id} = lead, attrs, telecaller_id) do
    lead
    |> Lead.telecaller_update_changeset(attrs)
    |> Repo.update()
  end

  def update_lead(_lead, _attrs, _telecaller_id) do
    {:error, :unauthorized}
  end

  @doc """
  Distributes leads evenly across telecallers using round-robin algorithm.

  Returns a list of lead maps with telecaller_id and assigned_at set.

  ## Examples

      iex> distribute_leads([%{name: "John"}, %{name: "Jane"}], [tc1_id, tc2_id])
      [
        %{name: "John", telecaller_id: tc1_id, assigned_at: ~U[...]},
        %{name: "Jane", telecaller_id: tc2_id, assigned_at: ~U[...]}
      ]

  """
  def distribute_leads(leads, telecaller_ids) when is_list(leads) and is_list(telecaller_ids) do
    assigned_at = DateTime.utc_now() |> DateTime.truncate(:second)
    telecaller_count = length(telecaller_ids)

    leads
    |> Enum.with_index()
    |> Enum.map(fn {lead, index} ->
      telecaller_id = Enum.at(telecaller_ids, rem(index, telecaller_count))

      lead
      |> Map.put(:telecaller_id, telecaller_id)
      |> Map.put(:assigned_at, assigned_at)
    end)
  end

  @doc """
  Bulk creates leads with batch insert.

  Returns {:ok, count} on success or {:error, reason} on failure.

  ## Examples

      iex> bulk_create_leads([%{student_name: "John", phone_number: "123"}], branch_id)
      {:ok, 1}

      iex> bulk_create_leads([], branch_id)
      {:ok, 0}

  """
  def bulk_create_leads(leads, branch_id) when is_list(leads) do
    now_naive = NaiveDateTime.utc_now() |> NaiveDateTime.truncate(:second)

    leads_with_timestamps =
      leads
      |> Enum.map(fn lead ->
        lead
        |> Map.put(:branch_id, branch_id)
        |> Map.put(:status, "new")
        |> Map.put(:call_count, 0)
        |> Map.put(:inserted_at, now_naive)
        |> Map.put(:updated_at, now_naive)
      end)

    {count, _leads} = Repo.insert_all(Lead, leads_with_timestamps, returning: true)
    {:ok, count}
  end

  @doc """
  Lists leads with filtering, search, and pagination.

  ## Options

    * `:telecaller_id` - Filter by telecaller (required)
    * `:status` - Filter by lead status
    * `:search` - Search by student name or phone number
    * `:page` - Page number (default: 1)
    * `:per_page` - Results per page (default: 50)

  ## Examples

      iex> list_leads(telecaller_id: tc_id)
      [%Lead{}, ...]

      iex> list_leads(telecaller_id: tc_id, status: "interested", page: 2)
      [%Lead{}, ...]

  """
  def list_leads(opts) do
    telecaller_id = Keyword.fetch!(opts, :telecaller_id)
    status = Keyword.get(opts, :status)
    search = Keyword.get(opts, :search)
    page = Keyword.get(opts, :page, 1)
    per_page = Keyword.get(opts, :per_page, 50)

    offset = (page - 1) * per_page

    Lead
    |> where([l], l.telecaller_id == ^telecaller_id)
    |> filter_by_status(status)
    |> search_leads(search)
    |> sort_by_followups()
    |> limit(^per_page)
    |> offset(^offset)
    |> preload([:followups])
    |> Repo.all()
  end

  defp filter_by_status(query, nil), do: query

  defp filter_by_status(query, status) do
    where(query, [l], l.status == ^status)
  end

  defp search_leads(query, nil), do: query

  defp search_leads(query, search_term) do
    search_pattern = "%#{search_term}%"

    where(
      query,
      [l],
      ilike(l.student_name, ^search_pattern) or ilike(l.phone_number, ^search_pattern)
    )
  end

  defp sort_by_followups(query) do
    query
    |> join(:left, [l], f in assoc(l, :followups), as: :followup)
    |> where(
      [followup: f],
      is_nil(f.id) or (f.completed == false and f.scheduled_at <= ^DateTime.utc_now())
    )
    |> group_by([l], l.id)
    |> order_by([l, followup: f],
      desc:
        fragment(
          "COUNT(CASE WHEN ? = false AND ? <= ? THEN 1 END)",
          f.completed,
          f.scheduled_at,
          ^DateTime.utc_now()
        ),
      desc: l.updated_at
    )
  end

  @doc """
  Counts total leads for a telecaller with optional filters.

  ## Examples

      iex> count_leads(telecaller_id: tc_id)
      42

      iex> count_leads(telecaller_id: tc_id, status: "interested")
      10

  """
  def count_leads(opts) do
    telecaller_id = Keyword.fetch!(opts, :telecaller_id)
    status = Keyword.get(opts, :status)
    search = Keyword.get(opts, :search)

    Lead
    |> where([l], l.telecaller_id == ^telecaller_id)
    |> filter_by_status(status)
    |> search_leads(search)
    |> Repo.aggregate(:count)
  end

  @doc """
  Adds a note to a lead.

  Updates the lead's last_contacted_at timestamp.

  ## Examples

      iex> add_note(lead_id, "Called and discussed courses", telecaller_id)
      {:ok, %LeadNote{}}

      iex> add_note(lead_id, "", telecaller_id)
      {:error, %Ecto.Changeset{}}

  """
  def add_note(lead_id, note_text, telecaller_id) do
    Repo.transaction(fn ->
      note_attrs = %{
        lead_id: lead_id,
        telecaller_id: telecaller_id,
        note: note_text
      }

      case %LeadNote{}
           |> LeadNote.changeset(note_attrs)
           |> Repo.insert() do
        {:ok, note} ->
          update_lead_contact_time(lead_id)
          note

        {:error, changeset} ->
          Repo.rollback(changeset)
      end
    end)
  end

  @doc """
  Logs a call attempt for a lead.

  Updates the lead's last_contacted_at and increments call_count.

  ## Examples

      iex> log_call(lead_id, %{outcome: "connected", duration_seconds: 120}, telecaller_id)
      {:ok, %CallLog{}}

      iex> log_call(lead_id, %{outcome: "invalid"}, telecaller_id)
      {:error, %Ecto.Changeset{}}

  """
  def log_call(lead_id, call_attrs, telecaller_id) do
    Repo.transaction(fn ->
      attrs_with_ids =
        call_attrs
        |> Map.put(:lead_id, lead_id)
        |> Map.put(:telecaller_id, telecaller_id)

      case %CallLog{}
           |> CallLog.changeset(attrs_with_ids)
           |> Repo.insert() do
        {:ok, call_log} ->
          increment_call_count(lead_id)
          update_lead_contact_time(lead_id)
          call_log

        {:error, changeset} ->
          Repo.rollback(changeset)
      end
    end)
  end

  @doc """
  Attaches a recording file path to an existing call log.

  ## Examples

      iex> attach_recording(call_log_id, "/path/to/recording.aac")
      {:ok, %CallLog{}}

      iex> attach_recording(invalid_id, "/path/to/recording.aac")
      {:error, :not_found}

  """
  def attach_recording(call_log_id, file_path) do
    case Repo.get(CallLog, call_log_id) do
      nil ->
        {:error, :not_found}

      call_log ->
        call_log
        |> CallLog.changeset(%{recording_path: file_path})
        |> Repo.update()
    end
  end

  defp update_lead_contact_time(lead_id) do
    from(l in Lead, where: l.id == ^lead_id)
    |> Repo.update_all(
      set: [last_contacted_at: DateTime.utc_now(), updated_at: DateTime.utc_now()]
    )
  end

  defp increment_call_count(lead_id) do
    from(l in Lead, where: l.id == ^lead_id)
    |> Repo.update_all(inc: [call_count: 1], set: [updated_at: DateTime.utc_now()])
  end
end
