defmodule EducationCrmWeb.Admin.ReportLive.Index do
  @moduledoc """
  LiveView for performance reports with filters and CSV export.
  """
  use EducationCrmWeb, :live_view

  alias EducationCrm.{Reports, Branches, Accounts}

  @impl true
  def mount(_params, _session, socket) do
    branches = Branches.list_branches()

    # Default to last 30 days
    end_date = Date.utc_today()
    start_date = Date.add(end_date, -30)

    socket =
      socket
      |> assign(:page_title, "Performance Reports")
      |> assign(:branches, branches)
      |> assign(:telecallers, [])
      |> assign(:start_date, start_date)
      |> assign(:end_date, end_date)
      |> assign(:filter_branch_id, nil)
      |> assign(:filter_telecaller_id, nil)
      |> assign(:report_data, [])
      |> assign(:sort_by, :telecaller_name)
      |> assign(:sort_order, :asc)

    {:ok, socket}
  end

  @impl true
  def handle_event("filter", params, socket) do
    start_date = parse_date(params["start_date"])
    end_date = parse_date(params["end_date"])
    branch_id = if params["branch_id"] == "", do: nil, else: params["branch_id"]
    telecaller_id = if params["telecaller_id"] == "", do: nil, else: params["telecaller_id"]

    # Load telecallers for the selected branch
    telecallers =
      if branch_id do
        Accounts.list_telecallers(%{branch_id: branch_id, active: true})
      else
        []
      end

    socket =
      socket
      |> assign(:start_date, start_date)
      |> assign(:end_date, end_date)
      |> assign(:filter_branch_id, branch_id)
      |> assign(:filter_telecaller_id, telecaller_id)
      |> assign(:telecallers, telecallers)

    {:noreply, socket}
  end

  @impl true
  def handle_event("generate_report", _params, socket) do
    filters = build_filters(socket.assigns)

    report_data = Reports.telecaller_performance(filters)

    socket =
      socket
      |> assign(:report_data, report_data)
      |> put_flash(:info, "Report generated successfully")

    {:noreply, socket}
  end

  @impl true
  def handle_event("sort", %{"column" => column}, socket) do
    column_atom = String.to_existing_atom(column)
    current_sort = socket.assigns.sort_by
    current_order = socket.assigns.sort_order

    {new_sort, new_order} =
      if current_sort == column_atom do
        {column_atom, toggle_order(current_order)}
      else
        {column_atom, :asc}
      end

    sorted_data = sort_report_data(socket.assigns.report_data, new_sort, new_order)

    socket =
      socket
      |> assign(:sort_by, new_sort)
      |> assign(:sort_order, new_order)
      |> assign(:report_data, sorted_data)

    {:noreply, socket}
  end

  @impl true
  def handle_event("export_csv", _params, socket) do
    csv_content = Reports.export_report(socket.assigns.report_data)

    filename =
      "telecaller_performance_#{Date.to_string(socket.assigns.start_date)}_to_#{Date.to_string(socket.assigns.end_date)}.csv"

    socket =
      socket
      |> push_event("download_csv", %{content: csv_content, filename: filename})

    {:noreply, socket}
  end

  defp build_filters(assigns) do
    filters = %{}

    filters =
      if assigns.start_date do
        start_datetime = DateTime.new!(assigns.start_date, ~T[00:00:00])
        Map.put(filters, :start_date, start_datetime)
      else
        filters
      end

    filters =
      if assigns.end_date do
        end_datetime = DateTime.new!(assigns.end_date, ~T[23:59:59])
        Map.put(filters, :end_date, end_datetime)
      else
        filters
      end

    filters =
      if assigns.filter_branch_id do
        Map.put(filters, :branch_id, assigns.filter_branch_id)
      else
        filters
      end

    filters =
      if assigns.filter_telecaller_id do
        Map.put(filters, :telecaller_id, assigns.filter_telecaller_id)
      else
        filters
      end

    filters
  end

  defp parse_date(""), do: nil
  defp parse_date(nil), do: nil

  defp parse_date(date_string) do
    case Date.from_iso8601(date_string) do
      {:ok, date} -> date
      _ -> nil
    end
  end

  defp toggle_order(:asc), do: :desc
  defp toggle_order(:desc), do: :asc

  defp sort_report_data(data, column, order) do
    sorted =
      Enum.sort_by(data, fn row ->
        Map.get(row, column)
      end)

    if order == :desc, do: Enum.reverse(sorted), else: sorted
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="space-y-6">
      <!-- Page Header -->
      <div>
        <h1 class="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Performance Reports
        </h1>
        <p class="text-gray-600 mt-1">Analyze telecaller performance and metrics</p>
      </div>
      
    <!-- Filters -->
      <div class="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
        <form phx-change="filter" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Start Date -->
            <div>
              <label for="start_date" class="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                id="start_date"
                value={@start_date && Date.to_iso8601(@start_date)}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
    <!-- End Date -->
            <div>
              <label for="end_date" class="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                name="end_date"
                id="end_date"
                value={@end_date && Date.to_iso8601(@end_date)}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
    <!-- Branch Filter -->
            <div>
              <label for="branch_id" class="block text-sm font-medium text-gray-700 mb-2">
                Branch
              </label>
              <select
                name="branch_id"
                id="branch_id"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Branches</option>
                <%= for branch <- @branches do %>
                  <option value={branch.id} selected={branch.id == @filter_branch_id}>
                    {branch.name}
                  </option>
                <% end %>
              </select>
            </div>
            
    <!-- Telecaller Filter -->
            <div>
              <label for="telecaller_id" class="block text-sm font-medium text-gray-700 mb-2">
                Telecaller
              </label>
              <select
                name="telecaller_id"
                id="telecaller_id"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Telecallers</option>
                <%= for telecaller <- @telecallers do %>
                  <option value={telecaller.id} selected={telecaller.id == @filter_telecaller_id}>
                    {telecaller.username}
                  </option>
                <% end %>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <button
              type="button"
              phx-click="generate_report"
              class="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
            >
              <.icon name="hero-chart-bar" class="w-5 h-5 inline mr-2" /> Generate Report
            </button>
          </div>
        </form>
      </div>
      
    <!-- Report Table -->
      <%= if @report_data != [] do %>
        <div class="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
          <div class="p-6 border-b border-purple-100 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Report Results</h2>
            <button
              phx-click="export_csv"
              class="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <.icon name="hero-arrow-down-tray" class="w-4 h-4 inline mr-2" /> Export CSV
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
                <tr>
                  <th
                    phx-click="sort"
                    phx-value-column="telecaller_name"
                    class="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-purple-100"
                  >
                    <div class="flex items-center gap-2">
                      Telecaller {sort_icon(@sort_by, @sort_order, :telecaller_name)}
                    </div>
                  </th>
                  <th
                    phx-click="sort"
                    phx-value-column="calls_made"
                    class="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-purple-100"
                  >
                    <div class="flex items-center gap-2">
                      Calls Made {sort_icon(@sort_by, @sort_order, :calls_made)}
                    </div>
                  </th>
                  <th
                    phx-click="sort"
                    phx-value-column="connected_calls"
                    class="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-purple-100"
                  >
                    <div class="flex items-center gap-2">
                      Connected {sort_icon(@sort_by, @sort_order, :connected_calls)}
                    </div>
                  </th>
                  <th
                    phx-click="sort"
                    phx-value-column="leads_assigned"
                    class="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-purple-100"
                  >
                    <div class="flex items-center gap-2">
                      Assigned {sort_icon(@sort_by, @sort_order, :leads_assigned)}
                    </div>
                  </th>
                  <th
                    phx-click="sort"
                    phx-value-column="leads_contacted"
                    class="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-purple-100"
                  >
                    <div class="flex items-center gap-2">
                      Contacted {sort_icon(@sort_by, @sort_order, :leads_contacted)}
                    </div>
                  </th>
                  <th
                    phx-click="sort"
                    phx-value-column="leads_enrolled"
                    class="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-purple-100"
                  >
                    <div class="flex items-center gap-2">
                      Enrolled {sort_icon(@sort_by, @sort_order, :leads_enrolled)}
                    </div>
                  </th>
                  <th
                    phx-click="sort"
                    phx-value-column="conversion_rate"
                    class="px-6 py-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-purple-100"
                  >
                    <div class="flex items-center gap-2">
                      Conversion % {sort_icon(@sort_by, @sort_order, :conversion_rate)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <%= for row <- @report_data do %>
                  <tr class="hover:bg-purple-50/50 transition-colors">
                    <td class="px-6 py-4">
                      <p class="font-medium text-gray-900">{row.telecaller_name}</p>
                    </td>
                    <td class="px-6 py-4 text-gray-700">{row.calls_made}</td>
                    <td class="px-6 py-4 text-gray-700">{row.connected_calls}</td>
                    <td class="px-6 py-4 text-gray-700">{row.leads_assigned}</td>
                    <td class="px-6 py-4 text-gray-700">{row.leads_contacted}</td>
                    <td class="px-6 py-4">
                      <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        {row.leads_enrolled}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <span class={[
                        "px-3 py-1 rounded-full text-sm font-medium",
                        conversion_color(row.conversion_rate)
                      ]}>
                        {row.conversion_rate}%
                      </span>
                    </td>
                  </tr>
                <% end %>
              </tbody>
            </table>
          </div>
        </div>
      <% else %>
        <div class="bg-white rounded-2xl shadow-lg p-12 border border-purple-100 text-center">
          <.icon name="hero-document-chart-bar" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p class="text-gray-500 text-lg">No report data yet</p>
          <p class="text-gray-400 text-sm mt-1">
            Select your filters and click "Generate Report" to view performance metrics
          </p>
        </div>
      <% end %>
    </div>
    """
  end

  defp sort_icon(current_sort, current_order, column) do
    cond do
      current_sort == column && current_order == :asc ->
        Phoenix.HTML.raw(
          ~s(<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>)
        )

      current_sort == column && current_order == :desc ->
        Phoenix.HTML.raw(
          ~s(<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"/></svg>)
        )

      true ->
        Phoenix.HTML.raw(
          ~s(<svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"/></svg>)
        )
    end
  end

  defp conversion_color(rate) when rate >= 20, do: "bg-green-100 text-green-700"
  defp conversion_color(rate) when rate >= 10, do: "bg-yellow-100 text-yellow-700"
  defp conversion_color(_), do: "bg-red-100 text-red-700"
end
