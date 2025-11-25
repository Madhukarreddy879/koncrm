defmodule EducationCrmWeb.Admin.TelecallerLive.Index do
  @moduledoc """
  LiveView for managing telecallers with filters and create action.
  """
  use EducationCrmWeb, :live_view

  alias EducationCrm.Accounts
  alias EducationCrm.Branches
  alias EducationCrm.Accounts.User

  @impl true
  def mount(_params, _session, socket) do
    branches = Branches.list_branches()

    socket =
      socket
      |> assign(:page_title, "Telecallers")
      |> assign(:branches, branches)
      |> assign(:filter_branch_id, nil)
      |> assign(:filter_active, true)
      |> load_telecallers()

    {:ok, socket}
  end

  @impl true
  def handle_params(params, _url, socket) do
    {:noreply, apply_action(socket, socket.assigns.live_action, params)}
  end

  defp apply_action(socket, :index, _params) do
    socket
    |> assign(:page_title, "Telecallers")
    |> assign(:telecaller, nil)
  end

  defp apply_action(socket, :new, _params) do
    socket
    |> assign(:page_title, "New Telecaller")
    |> assign(:telecaller, %User{})
  end

  @impl true
  def handle_event("filter", %{"branch_id" => branch_id, "active" => active}, socket) do
    branch_id = if branch_id == "", do: nil, else: branch_id
    active = active == "true"

    socket =
      socket
      |> assign(:filter_branch_id, branch_id)
      |> assign(:filter_active, active)
      |> load_telecallers()

    {:noreply, socket}
  end

  @impl true
  def handle_event("deactivate", %{"id" => id}, socket) do
    case Accounts.deactivate_telecaller(id) do
      {:ok, _user} ->
        {:noreply,
         socket
         |> put_flash(:info, "Telecaller deactivated successfully")
         |> load_telecallers()}

      {:error, _} ->
        {:noreply, put_flash(socket, :error, "Failed to deactivate telecaller")}
    end
  end

  @impl true
  def handle_info({:telecaller_saved, _telecaller}, socket) do
    {:noreply,
     socket
     |> put_flash(:info, "Telecaller created successfully")
     |> load_telecallers()
     |> push_patch(to: ~p"/admin/telecallers")}
  end

  defp load_telecallers(socket) do
    filters = %{}

    filters =
      if socket.assigns.filter_branch_id do
        Map.put(filters, :branch_id, socket.assigns.filter_branch_id)
      else
        filters
      end

    filters = Map.put(filters, :active, socket.assigns.filter_active)

    telecallers = Accounts.list_telecallers(filters)

    # Preload branches for display
    telecallers_with_branches =
      Enum.map(telecallers, fn tc ->
        branch = Enum.find(socket.assigns.branches, &(&1.id == tc.branch_id))
        Map.put(tc, :branch, branch)
      end)

    stream(socket, :telecallers, telecallers_with_branches, reset: true)
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Telecallers
          </h1>
          <p class="text-gray-600 mt-1">Manage telecaller accounts</p>
        </div>
        <.link
          patch={~p"/admin/telecallers/new"}
          class="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
        >
          <.icon name="hero-plus" class="w-5 h-5 inline mr-2" /> New Telecaller
        </.link>
      </div>
      
    <!-- Filters -->
      <div class="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
        <form phx-change="filter" class="flex flex-wrap gap-4">
          <div class="flex-1 min-w-[200px]">
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

          <div class="flex-1 min-w-[200px]">
            <label for="active" class="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              name="active"
              id="active"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="true" selected={@filter_active == true}>Active</option>
              <option value="false" selected={@filter_active == false}>Inactive</option>
            </select>
          </div>
        </form>
      </div>
      
    <!-- Telecallers List -->
      <div class="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
              <tr>
                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Username</th>
                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Branch</th>
                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Lead Count</th>
                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th class="px-6 py-4 text-right text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody id="telecallers" phx-update="stream" class="divide-y divide-gray-100">
              <tr
                :for={{id, telecaller} <- @streams.telecallers}
                id={id}
                class="hover:bg-purple-50/50 transition-colors"
              >
                <td class="px-6 py-4">
                  <p class="font-medium text-gray-900">{telecaller.username}</p>
                </td>
                <td class="px-6 py-4">
                  <p class="text-gray-600">{telecaller.branch && telecaller.branch.name}</p>
                </td>
                <td class="px-6 py-4">
                  <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    {telecaller.lead_count} leads
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span class={[
                    "px-3 py-1 rounded-full text-xs font-medium",
                    if(telecaller.active,
                      do: "bg-green-100 text-green-700",
                      else: "bg-gray-100 text-gray-600"
                    )
                  ]}>
                    {if telecaller.active, do: "Active", else: "Inactive"}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <%= if telecaller.active do %>
                    <button
                      phx-click="deactivate"
                      phx-value-id={telecaller.id}
                      data-confirm="Are you sure you want to deactivate this telecaller?"
                      class="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <.icon name="hero-trash" class="w-4 h-4 inline mr-1" /> Deactivate
                    </button>
                  <% end %>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div :if={@streams.telecallers == %{}} class="p-12 text-center">
          <.icon name="hero-users" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p class="text-gray-500 text-lg">No telecallers found</p>
          <p class="text-gray-400 text-sm mt-1">
            Try adjusting your filters or create a new telecaller
          </p>
        </div>
      </div>
      
    <!-- Modal -->
      <.modal
        :if={@live_action == :new}
        id="telecaller-modal"
        show
        on_cancel={JS.patch(~p"/admin/telecallers")}
      >
        <.live_component
          module={EducationCrmWeb.Admin.TelecallerLive.FormComponent}
          id={:new}
          title={@page_title}
          action={@live_action}
          telecaller={@telecaller}
          branches={@branches}
          patch={~p"/admin/telecallers"}
        />
      </.modal>
    </div>
    """
  end
end
