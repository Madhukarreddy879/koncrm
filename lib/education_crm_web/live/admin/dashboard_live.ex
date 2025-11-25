defmodule EducationCrmWeb.Admin.DashboardLive do
  @moduledoc """
  Admin dashboard showing system overview and real-time statistics.
  """
  use EducationCrmWeb, :live_view

  import Ecto.Query
  alias EducationCrm.Repo
  alias EducationCrm.Leads.{Lead, CallLog}
  alias EducationCrm.Accounts.User

  @impl true
  def mount(_params, _session, socket) do
    if connected?(socket) do
      # Subscribe to real-time updates
      Phoenix.PubSub.subscribe(EducationCrm.PubSub, "dashboard_updates")
    end

    socket =
      socket
      |> assign(:page_title, "Dashboard")
      |> load_stats()

    {:ok, socket}
  end

  @impl true
  def handle_info({:stats_updated, _data}, socket) do
    {:noreply, load_stats(socket)}
  end

  defp load_stats(socket) do
    today_start = DateTime.utc_now() |> DateTime.to_date() |> DateTime.new!(~T[00:00:00])

    # Total leads
    total_leads = Repo.aggregate(Lead, :count)

    # Active telecallers
    active_telecallers =
      from(u in User,
        where: u.role == "telecaller" and u.active == true
      )
      |> Repo.aggregate(:count)

    # Today's calls
    todays_calls =
      from(c in CallLog,
        where: c.inserted_at >= ^today_start
      )
      |> Repo.aggregate(:count)

    # Leads by status
    leads_by_status =
      from(l in Lead,
        group_by: l.status,
        select: {l.status, count(l.id)}
      )
      |> Repo.all()
      |> Map.new()

    # Recent activity (last 10 calls)
    recent_calls =
      from(c in CallLog,
        order_by: [desc: c.inserted_at],
        limit: 10,
        preload: [:telecaller, lead: [:branch]]
      )
      |> Repo.all()

    socket
    |> assign(:total_leads, total_leads)
    |> assign(:active_telecallers, active_telecallers)
    |> assign(:todays_calls, todays_calls)
    |> assign(:leads_by_status, leads_by_status)
    |> assign(:recent_calls, recent_calls)
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="space-y-8">
      <!-- Page Header -->
      <div>
        <h1 class="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p class="text-gray-600 mt-1">System overview and real-time statistics</p>
      </div>
      
    <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Total Leads Card -->
        <div class="bg-white rounded-2xl shadow-lg p-6 border border-purple-100 hover:shadow-xl transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Leads</p>
              <p class="text-3xl font-bold text-purple-600 mt-2">{@total_leads}</p>
            </div>
            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <.icon name="hero-users" class="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        
    <!-- Active Telecallers Card -->
        <div class="bg-white rounded-2xl shadow-lg p-6 border border-pink-100 hover:shadow-xl transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Active Telecallers</p>
              <p class="text-3xl font-bold text-pink-600 mt-2">{@active_telecallers}</p>
            </div>
            <div class="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
              <.icon name="hero-user-group" class="w-6 h-6 text-pink-600" />
            </div>
          </div>
        </div>
        
    <!-- Today's Calls Card -->
        <div class="bg-white rounded-2xl shadow-lg p-6 border border-indigo-100 hover:shadow-xl transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Today's Calls</p>
              <p class="text-3xl font-bold text-indigo-600 mt-2">{@todays_calls}</p>
            </div>
            <div class="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <.icon name="hero-phone" class="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>
      
    <!-- Leads by Status -->
      <div class="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
        <h2 class="text-xl font-bold text-gray-900 mb-4">Leads by Status</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div class="text-center p-4 bg-gray-50 rounded-lg">
            <p class="text-2xl font-bold text-gray-700">{Map.get(@leads_by_status, "new", 0)}</p>
            <p class="text-sm text-gray-600 mt-1">New</p>
          </div>
          <div class="text-center p-4 bg-blue-50 rounded-lg">
            <p class="text-2xl font-bold text-blue-700">
              {Map.get(@leads_by_status, "contacted", 0)}
            </p>
            <p class="text-sm text-blue-600 mt-1">Contacted</p>
          </div>
          <div class="text-center p-4 bg-green-50 rounded-lg">
            <p class="text-2xl font-bold text-green-700">
              {Map.get(@leads_by_status, "interested", 0)}
            </p>
            <p class="text-sm text-green-600 mt-1">Interested</p>
          </div>
          <div class="text-center p-4 bg-yellow-50 rounded-lg">
            <p class="text-2xl font-bold text-yellow-700">
              {Map.get(@leads_by_status, "not_interested", 0)}
            </p>
            <p class="text-sm text-yellow-600 mt-1">Not Interested</p>
          </div>
          <div class="text-center p-4 bg-purple-50 rounded-lg">
            <p class="text-2xl font-bold text-purple-700">
              {Map.get(@leads_by_status, "enrolled", 0)}
            </p>
            <p class="text-sm text-purple-600 mt-1">Enrolled</p>
          </div>
          <div class="text-center p-4 bg-red-50 rounded-lg">
            <p class="text-2xl font-bold text-red-700">{Map.get(@leads_by_status, "lost", 0)}</p>
            <p class="text-sm text-red-600 mt-1">Lost</p>
          </div>
        </div>
      </div>
      
    <!-- Recent Activity -->
      <div class="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
        <h2 class="text-xl font-bold text-gray-900 mb-4">Recent Call Activity</h2>
        <div class="space-y-3">
          <%= if @recent_calls == [] do %>
            <p class="text-gray-500 text-center py-8">No recent call activity</p>
          <% else %>
            <%= for call <- @recent_calls do %>
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="flex items-center gap-4">
                  <div class={[
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    outcome_color(call.outcome)
                  ]}>
                    <.icon name="hero-phone" class="w-5 h-5" />
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{call.lead.student_name}</p>
                    <p class="text-sm text-gray-600">
                      by {call.telecaller.username} • {call.lead.branch.name}
                    </p>
                  </div>
                </div>
                <div class="text-right">
                  <p class={["text-sm font-medium capitalize", outcome_text_color(call.outcome)]}>
                    {call.outcome}
                  </p>
                  <p class="text-xs text-gray-500">{format_time_ago(call.inserted_at)}</p>
                </div>
              </div>
            <% end %>
          <% end %>
        </div>
      </div>
    </div>
    """
  end

  defp outcome_color("connected"), do: "bg-green-100 text-green-600"
  defp outcome_color("no_answer"), do: "bg-yellow-100 text-yellow-600"
  defp outcome_color("busy"), do: "bg-orange-100 text-orange-600"
  defp outcome_color("invalid_number"), do: "bg-red-100 text-red-600"
  defp outcome_color(_), do: "bg-gray-100 text-gray-600"

  defp outcome_text_color("connected"), do: "text-green-600"
  defp outcome_text_color("no_answer"), do: "text-yellow-600"
  defp outcome_text_color("busy"), do: "text-orange-600"
  defp outcome_text_color("invalid_number"), do: "text-red-600"
  defp outcome_text_color(_), do: "text-gray-600"

  defp format_time_ago(datetime) do
    datetime =
      case datetime do
        %NaiveDateTime{} -> DateTime.from_naive!(datetime, "Etc/UTC")
        _ -> datetime
      end

    now = DateTime.utc_now()
    diff = DateTime.diff(now, datetime, :second)

    cond do
      diff < 60 -> "#{diff}s ago"
      diff < 3600 -> "#{div(diff, 60)}m ago"
      diff < 86400 -> "#{div(diff, 3600)}h ago"
      true -> "#{div(diff, 86400)}d ago"
    end
  end
end
