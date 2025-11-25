defmodule EducationCrm.Followups do
  @moduledoc """
  The Followups context - manages follow-up tasks for leads.
  """

  import Ecto.Query, warn: false
  alias EducationCrm.Repo
  alias EducationCrm.Leads.Followup

  @doc """
  Creates a follow-up task for a lead.

  ## Examples

      iex> create_followup(lead_id, %{scheduled_at: ~U[2024-12-01 10:00:00Z], description: "Follow up call"}, telecaller_id)
      {:ok, %Followup{}}

      iex> create_followup(lead_id, %{}, telecaller_id)
      {:error, %Ecto.Changeset{}}

  """
  def create_followup(lead_id, attrs, telecaller_id) do
    attrs_with_ids =
      attrs
      |> Map.put(:lead_id, lead_id)
      |> Map.put(:telecaller_id, telecaller_id)

    %Followup{}
    |> Followup.changeset(attrs_with_ids)
    |> Repo.insert()
  end

  @doc """
  Lists due follow-ups filtered by telecaller and date.

  Returns follow-ups that are scheduled on or before the given date and not yet completed.

  ## Examples

      iex> list_due_followups(telecaller_id, ~U[2024-12-01 23:59:59Z])
      [%Followup{}, ...]

      iex> list_due_followups(telecaller_id, ~U[2024-12-01 00:00:00Z])
      []

  """
  def list_due_followups(telecaller_id, date \\ nil) do
    cutoff_date = date || DateTime.utc_now()

    Followup
    |> where([f], f.telecaller_id == ^telecaller_id)
    |> where([f], f.completed == false)
    |> where([f], f.scheduled_at <= ^cutoff_date)
    |> order_by([f], asc: f.scheduled_at)
    |> preload([:lead, :telecaller])
    |> Repo.all()
  end

  @doc """
  Lists all follow-ups for a telecaller with pagination.

  ## Options

    * `:telecaller_id` - Filter by telecaller (required)
    * `:completed` - Filter by completion status (optional)
    * `:page` - Page number (default: 1)
    * `:per_page` - Results per page (default: 50)

  ## Examples

      iex> list_followups(telecaller_id: tc_id)
      [%Followup{}, ...]

      iex> list_followups(telecaller_id: tc_id, completed: false, page: 2)
      [%Followup{}, ...]

  """
  def list_followups(opts) do
    telecaller_id = Keyword.fetch!(opts, :telecaller_id)
    completed = Keyword.get(opts, :completed)
    page = Keyword.get(opts, :page, 1)
    per_page = Keyword.get(opts, :per_page, 50)

    offset = (page - 1) * per_page

    Followup
    |> where([f], f.telecaller_id == ^telecaller_id)
    |> filter_by_completed(completed)
    |> order_by([f], desc: f.scheduled_at)
    |> limit(^per_page)
    |> offset(^offset)
    |> preload([:lead])
    |> Repo.all()
  end

  @doc """
  Counts total follow-ups for a telecaller with optional filters.

  ## Examples

      iex> count_followups(telecaller_id: tc_id)
      42

      iex> count_followups(telecaller_id: tc_id, completed: false)
      10

  """
  def count_followups(opts) do
    telecaller_id = Keyword.fetch!(opts, :telecaller_id)
    completed = Keyword.get(opts, :completed)

    Followup
    |> where([f], f.telecaller_id == ^telecaller_id)
    |> filter_by_completed(completed)
    |> Repo.aggregate(:count)
  end

  defp filter_by_completed(query, nil), do: query

  defp filter_by_completed(query, completed) when is_boolean(completed) do
    where(query, [f], f.completed == ^completed)
  end

  @doc """
  Marks a follow-up as completed with timestamp.

  ## Examples

      iex> complete_followup(followup_id)
      {:ok, %Followup{completed: true, completed_at: ~U[...]}}

      iex> complete_followup(invalid_id)
      {:error, :not_found}

  """
  def complete_followup(followup_id) do
    case Repo.get(Followup, followup_id) do
      nil ->
        {:error, :not_found}

      followup ->
        followup
        |> Followup.complete_changeset()
        |> Repo.update()
    end
  end

  @doc """
  Gets upcoming follow-up notifications for the next 24 hours.

  Returns follow-ups scheduled within the next 24 hours that are not yet completed,
  with telecaller and lead details preloaded for notification scheduling.

  ## Examples

      iex> get_upcoming_notifications()
      [%Followup{telecaller: %User{}, lead: %Lead{}}, ...]

  """
  def get_upcoming_notifications do
    now = DateTime.utc_now()
    twenty_four_hours_later = DateTime.add(now, 24, :hour)

    Followup
    |> where([f], f.completed == false)
    |> where([f], f.scheduled_at >= ^now)
    |> where([f], f.scheduled_at <= ^twenty_four_hours_later)
    |> order_by([f], asc: f.scheduled_at)
    |> preload([:telecaller, :lead])
    |> Repo.all()
  end
end
