defmodule EducationCrmWeb.Admin.TelecallerLive.FormComponent do
  @moduledoc """
  LiveComponent for telecaller creation form.
  """
  use EducationCrmWeb, :live_component

  alias EducationCrm.Accounts
  alias EducationCrm.Accounts.User

  @impl true
  def update(%{telecaller: telecaller} = assigns, socket) do
    changeset = User.changeset(telecaller, %{})

    socket =
      socket
      |> assign(assigns)
      |> assign(:form, to_form(changeset))

    {:ok, socket}
  end

  @impl true
  def handle_event("validate", %{"user" => user_params}, socket) do
    changeset =
      socket.assigns.telecaller
      |> User.changeset(user_params)
      |> Map.put(:action, :validate)

    {:noreply, assign(socket, :form, to_form(changeset))}
  end

  @impl true
  def handle_event("save", %{"user" => user_params}, socket) do
    case Accounts.create_telecaller(user_params, user_params["branch_id"]) do
      {:ok, telecaller} ->
        notify_parent({:telecaller_saved, telecaller})

        {:noreply,
         socket
         |> put_flash(:info, "Telecaller created successfully")
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
        id="telecaller-form"
        phx-target={@myself}
        phx-change="validate"
        phx-submit="save"
        class="space-y-6"
      >
        <div>
          <.input
            field={@form[:username]}
            type="text"
            label="Username"
            placeholder="e.g., john.doe"
            required
          />
        </div>

        <div>
          <.input
            field={@form[:password]}
            type="password"
            label="Password"
            placeholder="Minimum 8 characters"
            required
          />
        </div>

        <div>
          <label for="branch_id" class="block text-sm font-medium text-gray-900 mb-2">
            Branch <span class="text-red-500">*</span>
          </label>
          <select
            name="user[branch_id]"
            id="branch_id"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Select a branch</option>
            <%= for branch <- @branches do %>
              <option value={branch.id}>{branch.name}</option>
            <% end %>
          </select>
          <%= if @form[:branch_id].errors != [] do %>
            <p class="mt-2 text-sm text-red-600">
              {format_error(Enum.at(@form[:branch_id].errors, 0))}
            </p>
          <% end %>
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
            phx-disable-with="Creating..."
            class="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 rounded-lg transition-all shadow-lg"
          >
            Create Telecaller
          </.button>
        </div>
      </.form>
    </div>
    """
  end

  defp format_error({msg, _opts}), do: msg
  defp format_error(msg) when is_binary(msg), do: msg
end
