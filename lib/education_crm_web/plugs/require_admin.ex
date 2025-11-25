defmodule EducationCrmWeb.Plugs.RequireAdmin do
  @moduledoc """
  Plug to ensure only admin users can access certain routes.
  """
  import Phoenix.LiveView
  import Phoenix.Component

  alias EducationCrm.Accounts

  def on_mount(:require_admin, _params, session, socket) do
    case session do
      %{"admin_user_id" => user_id} when not is_nil(user_id) ->
        case Accounts.get_user(user_id) do
          %{role: "admin", active: true} = user ->
            {:cont, assign(socket, :current_admin, user)}

          _ ->
            {:halt, redirect_to_login(socket)}
        end

      _ ->
        {:halt, redirect_to_login(socket)}
    end
  end

  defp redirect_to_login(socket) do
    socket
    |> put_flash(:error, "You must be logged in as an admin to access this page.")
    |> redirect(to: "/admin/login")
  end
end
