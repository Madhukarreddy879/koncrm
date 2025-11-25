defmodule EducationCrmWeb.Admin.BranchLive.Index do
  @moduledoc """
  LiveView for managing branches with create/edit/deactivate actions.
  """
  use EducationCrmWeb, :live_view

  alias EducationCrm.Branches
  alias EducationCrm.Branches.Branch

  @impl true
  def mount(_params, _session, socket) do
    socket =
      socket
      |> assign(:page_title, "Branches")
      |> stream(:branches, Branches.list_branches())

    {:ok, socket}
  end

  @impl true
  def handle_params(params, _url, socket) do
    {:noreply, apply_action(socket, socket.assigns.live_action, params)}
  end

  defp apply_action(socket, :index, _params) do
    socket
    |> assign(:page_title, "Branches")
    |> assign(:branch, nil)
  end

  defp apply_action(socket, :new, _params) do
    socket
    |> assign(:page_title, "New Branch")
    |> assign(:branch, %Branch{})
  end

  defp apply_action(socket, :edit, %{"id" => id}) do
    socket
    |> assign(:page_title, "Edit Branch")
    |> assign(:branch, Branches.get_branch!(id))
  end

  @impl true
  def handle_event("delete", %{"id" => id}, socket) do
    branch = Branches.get_branch!(id)

    case Branches.deactivate_branch(branch) do
      {:ok, _branch} ->
        {:noreply,
         socket
         |> put_flash(:info, "Branch deactivated successfully")
         |> stream(:branches, Branches.list_branches(), reset: true)}

      {:error, _changeset} ->
        {:noreply, put_flash(socket, :error, "Failed to deactivate branch")}
    end
  end

  @impl true
  def handle_info({:branch_saved, _branch}, socket) do
    {:noreply,
     socket
     |> put_flash(:info, "Branch saved successfully")
     |> stream(:branches, Branches.list_branches(), reset: true)
     |> push_patch(to: ~p"/admin/branches")}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Branches
          </h1>
          <p class="text-gray-600 mt-1">Manage branch locations</p>
        </div>
        <.link
          patch={~p"/admin/branches/new"}
          class="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
        >
          <.icon name="hero-plus" class="w-5 h-5 inline mr-2" /> New Branch
        </.link>
      </div>
      
    <!-- Branches List -->
      <div class="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
              <tr>
                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Location</th>
                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th class="px-6 py-4 text-right text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody id="branches" phx-update="stream" class="divide-y divide-gray-100">
              <tr
                :for={{id, branch} <- @streams.branches}
                id={id}
                class="hover:bg-purple-50/50 transition-colors"
              >
                <td class="px-6 py-4">
                  <p class="font-medium text-gray-900">{branch.name}</p>
                </td>
                <td class="px-6 py-4">
                  <p class="text-gray-600">{branch.location}</p>
                </td>
                <td class="px-6 py-4">
                  <span class={[
                    "px-3 py-1 rounded-full text-xs font-medium",
                    if(branch.active,
                      do: "bg-green-100 text-green-700",
                      else: "bg-gray-100 text-gray-600"
                    )
                  ]}>
                    {if branch.active, do: "Active", else: "Inactive"}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <.link
                      patch={~p"/admin/branches/#{branch.id}/edit"}
                      class="px-3 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      <.icon name="hero-pencil" class="w-4 h-4 inline mr-1" /> Edit
                    </.link>
                    <%= if branch.active do %>
                      <button
                        phx-click="delete"
                        phx-value-id={branch.id}
                        data-confirm="Are you sure you want to deactivate this branch?"
                        class="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <.icon name="hero-trash" class="w-4 h-4 inline mr-1" /> Deactivate
                      </button>
                    <% end %>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div :if={@streams.branches == %{}} class="p-12 text-center">
          <.icon name="hero-building-office" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p class="text-gray-500 text-lg">No branches yet</p>
          <p class="text-gray-400 text-sm mt-1">Create your first branch to get started</p>
        </div>
      </div>
      
    <!-- Modal -->
      <.modal
        :if={@live_action in [:new, :edit]}
        id="branch-modal"
        show
        on_cancel={JS.patch(~p"/admin/branches")}
      >
        <.live_component
          module={EducationCrmWeb.Admin.BranchLive.FormComponent}
          id={@branch.id || :new}
          title={@page_title}
          action={@live_action}
          branch={@branch}
          patch={~p"/admin/branches"}
        />
      </.modal>
    </div>
    """
  end
end
