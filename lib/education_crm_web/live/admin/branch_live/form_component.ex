defmodule EducationCrmWeb.Admin.BranchLive.FormComponent do
  @moduledoc """
  LiveComponent for branch create/edit form.
  """
  use EducationCrmWeb, :live_component

  alias EducationCrm.Branches

  @impl true
  def update(%{branch: branch} = assigns, socket) do
    changeset = Branches.change_branch(branch)

    socket =
      socket
      |> assign(assigns)
      |> assign(:form, to_form(changeset))

    {:ok, socket}
  end

  @impl true
  def handle_event("validate", %{"branch" => branch_params}, socket) do
    changeset =
      socket.assigns.branch
      |> Branches.change_branch(branch_params)
      |> Map.put(:action, :validate)

    {:noreply, assign(socket, :form, to_form(changeset))}
  end

  @impl true
  def handle_event("save", %{"branch" => branch_params}, socket) do
    save_branch(socket, socket.assigns.action, branch_params)
  end

  defp save_branch(socket, :new, branch_params) do
    case Branches.create_branch(branch_params) do
      {:ok, branch} ->
        notify_parent({:branch_saved, branch})

        {:noreply,
         socket
         |> put_flash(:info, "Branch created successfully")
         |> push_patch(to: socket.assigns.patch)}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, :form, to_form(changeset))}
    end
  end

  defp save_branch(socket, :edit, branch_params) do
    case Branches.update_branch(socket.assigns.branch, branch_params) do
      {:ok, branch} ->
        notify_parent({:branch_saved, branch})

        {:noreply,
         socket
         |> put_flash(:info, "Branch updated successfully")
         |> push_patch(to: socket.assigns.patch)}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, :form, to_form(changeset))}
    end
  end

  defp notify_parent(msg), do: send(self(), msg)

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <h2 class="text-2xl font-bold text-gray-900 mb-6">{@title}</h2>

      <.form
        for={@form}
        id="branch-form"
        phx-target={@myself}
        phx-change="validate"
        phx-submit="save"
        class="space-y-6"
      >
        <div>
          <.input
            field={@form[:name]}
            type="text"
            label="Branch Name"
            placeholder="e.g., Hyderabad Main"
            required
          />
        </div>

        <div>
          <.input
            field={@form[:location]}
            type="text"
            label="Location"
            placeholder="e.g., Banjara Hills"
          />
        </div>

        <div class="flex items-center justify-end gap-3 pt-4">
          <.button
            type="button"
            phx-click={JS.patch(@patch)}
            class="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </.button>
          <.button
            type="submit"
            phx-disable-with="Saving..."
            class="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 rounded-lg transition-all shadow-lg"
          >
            Save Branch
          </.button>
        </div>
      </.form>
    </div>
    """
  end
end
