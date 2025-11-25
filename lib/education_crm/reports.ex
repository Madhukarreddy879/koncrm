defmodule EducationCrm.Reports do
  @moduledoc """
  The Reports context - generates analytics and performance reports.
  """

  import Ecto.Query, warn: false
  alias EducationCrm.Repo
  alias EducationCrm.Accounts.User
  alias EducationCrm.Leads.Lead
  alias EducationCrm.Leads.CallLog

  NimbleCSV.define(ReportCSV, separator: ",", escape: "\"")

  @doc """
  Generates telecaller performance report with aggregated metrics.

  Accepts filters:
    - :start_date - Start date for filtering (DateTime)
    - :end_date - End date for filtering (DateTime)
    - :branch_id - Filter by branch (UUID)
    - :telecaller_id - Filter by specific telecaller (UUID)

  Returns a list of maps with telecaller performance data:
    [
      %{
        telecaller_id: UUID,
        telecaller_name: string,
        branch_id: UUID,
        calls_made: integer,
        connected_calls: integer,
        leads_assigned: integer,
        leads_contacted: integer,
        leads_enrolled: integer,
        conversion_rate: float
      },
      ...
    ]
  """
  def telecaller_performance(filters \\ %{}) do
    start_date = Map.get(filters, :start_date)
    end_date = Map.get(filters, :end_date)
    branch_id = Map.get(filters, :branch_id)
    telecaller_id = Map.get(filters, :telecaller_id)

    # Base query for telecallers
    telecallers_query =
      from u in User,
        where: u.role == "telecaller" and u.active == true

    telecallers_query =
      if branch_id do
        from u in telecallers_query, where: u.branch_id == ^branch_id
      else
        telecallers_query
      end

    telecallers_query =
      if telecaller_id do
        from u in telecallers_query, where: u.id == ^telecaller_id
      else
        telecallers_query
      end

    telecallers = Repo.all(telecallers_query)

    # Generate report for each telecaller
    Enum.map(telecallers, fn telecaller ->
      call_stats = get_call_stats(telecaller.id, start_date, end_date)
      lead_stats = get_lead_stats(telecaller.id, start_date, end_date)

      conversion_rate =
        if lead_stats.leads_contacted > 0 do
          Float.round(lead_stats.leads_enrolled / lead_stats.leads_contacted * 100, 2)
        else
          0.0
        end

      %{
        telecaller_id: telecaller.id,
        telecaller_name: telecaller.username,
        branch_id: telecaller.branch_id,
        calls_made: call_stats.calls_made,
        connected_calls: call_stats.connected_calls,
        leads_assigned: lead_stats.leads_assigned,
        leads_contacted: lead_stats.leads_contacted,
        leads_enrolled: lead_stats.leads_enrolled,
        conversion_rate: conversion_rate
      }
    end)
  end

  defp get_call_stats(telecaller_id, start_date, end_date) do
    query =
      from c in CallLog,
        where: c.telecaller_id == ^telecaller_id

    query =
      if start_date do
        from c in query, where: c.inserted_at >= ^start_date
      else
        query
      end

    query =
      if end_date do
        from c in query, where: c.inserted_at <= ^end_date
      else
        query
      end

    result =
      from c in query,
        select: %{
          calls_made: count(c.id),
          connected_calls: fragment("COUNT(CASE WHEN ? = 'connected' THEN 1 END)", c.outcome)
        }

    Repo.one(result) || %{calls_made: 0, connected_calls: 0}
  end

  defp get_lead_stats(telecaller_id, start_date, end_date) do
    query =
      from l in Lead,
        where: l.telecaller_id == ^telecaller_id

    # Apply date filters based on assigned_at for leads_assigned
    # and last_contacted_at for contacted/enrolled leads
    assigned_query =
      if start_date do
        from l in query, where: is_nil(l.assigned_at) or l.assigned_at >= ^start_date
      else
        query
      end

    assigned_query =
      if end_date do
        from l in assigned_query, where: is_nil(l.assigned_at) or l.assigned_at <= ^end_date
      else
        assigned_query
      end

    # For contacted leads, filter by last_contacted_at
    contacted_query =
      from l in Lead,
        where: l.telecaller_id == ^telecaller_id

    contacted_query =
      if start_date do
        from l in contacted_query,
          where: not is_nil(l.last_contacted_at) and l.last_contacted_at >= ^start_date
      else
        contacted_query
      end

    contacted_query =
      if end_date do
        from l in contacted_query,
          where: not is_nil(l.last_contacted_at) and l.last_contacted_at <= ^end_date
      else
        contacted_query
      end

    leads_assigned = Repo.aggregate(assigned_query, :count, :id)

    contacted_result =
      from l in contacted_query,
        select: %{
          leads_contacted:
            count(
              l.id,
              :distinct
            ),
          leads_enrolled: fragment("COUNT(CASE WHEN ? = 'enrolled' THEN 1 END)", l.status)
        }

    contacted_stats = Repo.one(contacted_result) || %{leads_contacted: 0, leads_enrolled: 0}

    %{
      leads_assigned: leads_assigned,
      leads_contacted: contacted_stats.leads_contacted,
      leads_enrolled: contacted_stats.leads_enrolled
    }
  end

  @doc """
  Exports report data to CSV format.

  Accepts a list of report data maps (e.g., from telecaller_performance/1).

  Returns a CSV string with headers and data rows.

  Example:
      iex> report_data = telecaller_performance(%{branch_id: branch_id})
      iex> csv_string = export_report(report_data)
  """
  def export_report(report_data) when is_list(report_data) do
    headers = [
      "Telecaller ID",
      "Telecaller Name",
      "Branch ID",
      "Calls Made",
      "Connected Calls",
      "Leads Assigned",
      "Leads Contacted",
      "Leads Enrolled",
      "Conversion Rate (%)"
    ]

    rows =
      Enum.map(report_data, fn row ->
        [
          to_string(row.telecaller_id),
          row.telecaller_name,
          to_string(row.branch_id),
          to_string(row.calls_made),
          to_string(row.connected_calls),
          to_string(row.leads_assigned),
          to_string(row.leads_contacted),
          to_string(row.leads_enrolled),
          to_string(row.conversion_rate)
        ]
      end)

    [headers | rows]
    |> ReportCSV.dump_to_iodata()
    |> IO.iodata_to_binary()
  end

  def export_report(_), do: {:error, :invalid_data}
end
