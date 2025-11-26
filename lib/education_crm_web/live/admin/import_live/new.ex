defmodule EducationCrmWeb.Admin.ImportLive.New do
  @moduledoc """
  LiveView for CSV import with drag-drop upload and telecaller selection.
  """
  use EducationCrmWeb, :live_view

  alias EducationCrm.{Branches, Accounts, Imports}

  @impl true
  def mount(_params, _session, socket) do
    branches = Branches.list_branches()

    socket =
      socket
      |> assign(:page_title, "Import Leads")
      |> assign(:branches, branches)
      |> assign(:selected_branch_id, nil)
      |> assign(:telecallers, [])
      |> assign(:selected_telecaller_ids, [])
      |> assign(:uploaded_file, nil)
      |> assign(:import_result, nil)
      |> assign(:importing, false)
      |> allow_upload(:csv,
        accept: ~w(.csv),
        max_entries: 1,
        max_file_size: 10_000_000,
        auto_upload: true
      )

    {:ok, socket}
  end

  @impl true
  def handle_event("validate", %{"branch_id" => branch_id} = _params, socket) do
    branch_id = if branch_id == "", do: nil, else: branch_id

    telecallers =
      if branch_id do
        Accounts.list_telecallers(%{branch_id: branch_id, active: true})
      else
        []
      end

    socket =
      socket
      |> assign(:selected_branch_id, branch_id)
      |> assign(:telecallers, telecallers)
      |> assign(:selected_telecaller_ids, [])

    {:noreply, socket}
  end

  def handle_event("validate", _params, socket) do
    {:noreply, socket}
  end



  @impl true
  def handle_event("toggle_telecaller", %{"id" => id}, socket) do
    selected_ids = socket.assigns.selected_telecaller_ids

    new_selected_ids =
      if id in selected_ids do
        List.delete(selected_ids, id)
      else
        [id | selected_ids]
      end

    {:noreply, assign(socket, :selected_telecaller_ids, new_selected_ids)}
  end

  @impl true
  def handle_event("select_all_telecallers", _params, socket) do
    all_ids = Enum.map(socket.assigns.telecallers, & &1.id)
    {:noreply, assign(socket, :selected_telecaller_ids, all_ids)}
  end

  @impl true
  def handle_event("deselect_all_telecallers", _params, socket) do
    {:noreply, assign(socket, :selected_telecaller_ids, [])}
  end

  @impl true
  def handle_event("import", _params, socket) do
    cond do
      socket.assigns.selected_branch_id == nil ->
        {:noreply, put_flash(socket, :error, "Please select a branch")}

      socket.assigns.selected_telecaller_ids == [] ->
        {:noreply, put_flash(socket, :error, "Please select at least one telecaller")}

      socket.assigns.uploads.csv.entries == [] ->
        {:noreply, put_flash(socket, :error, "Please upload a CSV file")}

      not Enum.all?(socket.assigns.uploads.csv.entries, & &1.done?) ->
        {:noreply, put_flash(socket, :error, "Please wait for file upload to complete")}

      true ->
        # Process all uploaded entries
        uploaded_files =
          consume_uploaded_entries(socket, :csv, fn %{path: path}, entry ->
            dest = Path.join(System.tmp_dir!(), "#{entry.uuid}.csv")
            File.cp!(path, dest)
            {:ok, %{path: dest, client_name: entry.client_name}}
          end)

        socket =
          case uploaded_files do
            [uploaded_file | _] ->
              process_import(socket, uploaded_file)

            [] ->
              put_flash(socket, :error, "Failed to process uploaded file")
          end

        {:noreply, socket}
    end
  end

  @impl true
  def handle_event("cancel_upload", %{"ref" => ref}, socket) do
    {:noreply, cancel_upload(socket, :csv, ref)}
  end

  defp process_import(socket, uploaded_file) do
    branch_id = socket.assigns.selected_branch_id
    telecaller_ids = socket.assigns.selected_telecaller_ids
    admin_id = socket.assigns.current_admin.id
    filename = uploaded_file.client_name

    # Read the uploaded file content
    content = File.read!(uploaded_file.path)

    case Imports.import_leads(content, telecaller_ids, branch_id, admin_id, filename) do
      {:ok, result} ->
        socket
        |> assign(:importing, false)
        |> assign(:import_result, result)
        |> put_flash(:info, "Import completed successfully!")

      {:error, reason} ->
        error_message =
          case reason do
            :missing_name_column -> "CSV file is missing a name column"
            :missing_phone_column -> "CSV file is missing a phone column"
            _ -> "Import failed: #{inspect(reason)}"
          end

        socket
        |> assign(:importing, false)
        |> put_flash(:error, error_message)
    end
  end

  def handle_progress(:csv, _entry, socket) do
    # Just track progress, actual processing happens on button click
    {:noreply, socket}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="space-y-6">
      <!-- Page Header -->
      <div>
        <h1 class="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Import Leads
        </h1>
        <p class="text-gray-600 mt-1">Upload CSV file and assign to telecallers</p>
      </div>

    <!-- Import Form -->
      <form phx-change="validate" phx-submit="import" id="import-form">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Left Column: Upload and Selection -->
        <div class="space-y-6">
          <!-- Branch Selection -->
          <div class="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">1. Select Branch</h2>
            <select
              name="branch_id"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Choose a branch...</option>
              <%= for branch <- @branches do %>
                <option value={branch.id} selected={branch.id == @selected_branch_id}>
                  {branch.name}
                </option>
              <% end %>
            </select>
          </div>

    <!-- CSV Upload -->
          <div class="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">2. Upload CSV File</h2>

            <div>
              <div
                class="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center hover:border-purple-500 transition-colors"
                phx-drop-target={@uploads.csv.ref}
              >
                <.icon name="hero-arrow-up-tray" class="w-12 h-12 text-purple-400 mx-auto mb-3" />
                <p class="text-gray-700 font-medium mb-2">
                  Drag and drop your CSV file here
                </p>
                <p class="text-sm text-gray-500 mb-4">or</p>
                <label class="px-6 py-3 bg-purple-100 text-purple-700 font-medium rounded-lg hover:bg-purple-200 cursor-pointer inline-block transition-colors">
                  Browse Files <.live_file_input upload={@uploads.csv} class="hidden" />
                </label>
                <p class="text-xs text-gray-400 mt-3">CSV format: name, phone (max 10MB)</p>
              </div>

    <!-- Uploaded Files -->
              <%= for entry <- @uploads.csv.entries do %>
                <div class="mt-4 p-4 bg-purple-50 rounded-lg flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <.icon name="hero-document-text" class="w-6 h-6 text-purple-600" />
                    <div>
                      <p class="font-medium text-gray-900">{entry.client_name}</p>
                      <p class="text-sm text-gray-600">
                        {Float.round(entry.client_size / 1024, 1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    phx-click="cancel_upload"
                    phx-value-ref={entry.ref}
                    class="text-red-600 hover:text-red-700"
                  >
                    <.icon name="hero-x-mark" class="w-5 h-5" />
                  </button>
                </div>

    <!-- Upload Progress -->
                <div class="mt-2">
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all"
                      style={"width: #{entry.progress}%"}
                    >
                    </div>
                  </div>
                </div>

    <!-- Upload Errors -->
                <%= for err <- upload_errors(@uploads.csv, entry) do %>
                  <p class="mt-2 text-sm text-red-600">{error_to_string(err)}</p>
                <% end %>
              <% end %>
            </div>
          </div>
        </div>

    <!-- Right Column: Telecaller Selection -->
        <div class="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">3. Select Telecallers</h2>
            <%= if @telecallers != [] do %>
              <div class="flex gap-2">
                <button
                  type="button"
                  phx-click="select_all_telecallers"
                  class="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Select All
                </button>
                <span class="text-gray-300">|</span>
                <button
                  type="button"
                  phx-click="deselect_all_telecallers"
                  class="text-sm text-gray-600 hover:text-gray-700 font-medium"
                >
                  Clear
                </button>
              </div>
            <% end %>
          </div>

          <%= if @selected_branch_id == nil do %>
            <p class="text-gray-500 text-center py-8">Please select a branch first</p>
          <% else %>
            <%= if @telecallers == [] do %>
              <p class="text-gray-500 text-center py-8">No active telecallers in this branch</p>
            <% else %>
              <div class="space-y-2 max-h-96 overflow-y-auto">
                <%= for telecaller <- @telecallers do %>
                  <label class={[
                    "flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all",
                    if(telecaller.id in @selected_telecaller_ids,
                      do: "border-purple-500 bg-purple-50",
                      else: "border-gray-200 hover:border-purple-300"
                    )
                  ]}>
                    <div class="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={telecaller.id in @selected_telecaller_ids}
                        phx-click="toggle_telecaller"
                        phx-value-id={telecaller.id}
                        class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <div>
                        <p class="font-medium text-gray-900">{telecaller.username}</p>
                        <p class="text-sm text-gray-600">{telecaller.lead_count} current leads</p>
                      </div>
                    </div>
                  </label>
                <% end %>
              </div>

              <div class="mt-6 p-4 bg-purple-50 rounded-lg">
                <p class="text-sm text-gray-700">
                  <span class="font-semibold">{length(@selected_telecaller_ids)}</span>
                  telecaller(s) selected
                </p>
              </div>
            <% end %>
          <% end %>
        </div>
      </div>

    <!-- Import Button -->
      <div class="flex justify-end">
        <button
          type="submit"
          disabled={
            @importing || @selected_branch_id == nil || @selected_telecaller_ids == [] ||
              @uploads.csv.entries == []
          }
          class="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <%= if @importing do %>
            <.icon name="hero-arrow-path" class="w-5 h-5 inline mr-2 animate-spin" /> Importing...
          <% else %>
            <.icon name="hero-arrow-up-tray" class="w-5 h-5 inline mr-2" /> Start Import
          <% end %>
        </button>
      </div>
      </form>

    <!-- Import Results -->
      <%= if @import_result do %>
        <div class="bg-white rounded-2xl shadow-lg p-6 border border-green-200">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <.icon name="hero-check-circle" class="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 class="text-xl font-bold text-gray-900">Import Complete</h2>
              <p class="text-gray-600">Your leads have been imported and distributed</p>
            </div>
          </div>

    <!-- Summary Stats -->
          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="text-center p-4 bg-gray-50 rounded-lg">
              <p class="text-2xl font-bold text-gray-900">{@import_result.total_rows}</p>
              <p class="text-sm text-gray-600">Total Rows</p>
            </div>
            <div class="text-center p-4 bg-green-50 rounded-lg">
              <p class="text-2xl font-bold text-green-700">{@import_result.successful_rows}</p>
              <p class="text-sm text-green-600">Successful</p>
            </div>
            <div class="text-center p-4 bg-red-50 rounded-lg">
              <p class="text-2xl font-bold text-red-700">{@import_result.failed_rows}</p>
              <p class="text-sm text-red-600">Failed</p>
            </div>
          </div>

    <!-- Distribution Table -->
          <div class="mb-6">
            <h3 class="font-semibold text-gray-900 mb-3">Distribution per Telecaller</h3>
            <div class="space-y-2">
              <%= for {telecaller_id, count} <- @import_result.telecaller_distribution do %>
                <% telecaller = Enum.find(@telecallers, &(&1.id == telecaller_id)) %>
                <div class="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span class="font-medium text-gray-900">{telecaller && telecaller.username}</span>
                  <span class="px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-medium">
                    {count} leads
                  </span>
                </div>
              <% end %>
            </div>
          </div>

    <!-- Errors -->
          <%= if @import_result.errors != [] do %>
            <div>
              <h3 class="font-semibold text-gray-900 mb-3">Errors</h3>
              <div class="max-h-48 overflow-y-auto space-y-2">
                <%= for error <- @import_result.errors do %>
                  <div class="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p class="text-sm font-medium text-red-900">Row {error.row}</p>
                    <p class="text-sm text-red-700">{Enum.join(error.errors, ", ")}</p>
                  </div>
                <% end %>
              </div>
            </div>
          <% end %>
        </div>
      <% end %>
    </div>
    """
  end

  defp error_to_string(:too_large), do: "File is too large (max 10MB)"
  defp error_to_string(:not_accepted), do: "File type not accepted (CSV only)"
  defp error_to_string(:too_many_files), do: "Too many files (max 1)"
  defp error_to_string(err), do: "Upload error: #{inspect(err)}"
end
