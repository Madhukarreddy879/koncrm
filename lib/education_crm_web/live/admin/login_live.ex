defmodule EducationCrmWeb.Admin.LoginLive do
  @moduledoc """
  Admin login page with session management.
  """
  use EducationCrmWeb, :live_view

  import Phoenix.Controller, only: [get_csrf_token: 0]

  @impl true
  def mount(_params, _session, socket) do
    form = to_form(%{"username" => "", "password" => ""}, as: :login)

    socket =
      socket
      |> assign(:page_title, "Admin Login")
      |> assign(:form, form)
      |> assign(:error, nil)

    {:ok, socket}
  end

  @impl true
  def handle_event("validate", %{"login" => login_params}, socket) do
    form = to_form(login_params, as: :login)
    {:noreply, assign(socket, form: form, error: nil)}
  end

  @impl true
  def handle_event("submit", _params, socket) do
    # Form submission will be handled by the form action
    {:noreply, socket}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4">
      <div class="max-w-md w-full space-y-8">
        <div class="text-center">
          <h1 class="text-5xl font-bold text-white mb-2 tracking-tight">
            Education CRM
          </h1>
          <p class="text-purple-300 text-lg">Admin Portal</p>
        </div>

        <div class="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <form action={~p"/admin/login"} method="post" class="space-y-6">
            <input type="hidden" name="_csrf_token" value={get_csrf_token()} />

            <div>
              <label for="username" class="block text-sm font-medium text-purple-200 mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                id="username"
                required
                placeholder="Enter your username"
                class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-400 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-purple-200 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                id="password"
                required
                placeholder="Enter your password"
                class="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-400 focus:outline-none transition-colors"
              />
            </div>

            <%= if @error do %>
              <div class="rounded-lg bg-red-500/20 border border-red-500/50 p-4">
                <p class="text-sm text-red-200 flex items-center gap-2">
                  <.icon name="hero-exclamation-triangle" class="w-5 h-5" />
                  {@error}
                </p>
              </div>
            <% end %>

            <div>
              <button
                type="submit"
                class="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/50"
              >
                Sign In
              </button>
            </div>
          </form>
        </div>

        <p class="text-center text-sm text-purple-300">
          Secure admin access only
        </p>
      </div>
    </div>
    """
  end
end
