defmodule EducationCrmWeb.Admin.SessionController do
  use EducationCrmWeb, :controller

  alias EducationCrm.Accounts

  def create(conn, %{"username" => username, "password" => password}) do
    case Accounts.authenticate(username, password) do
      {:ok, _access_token, _refresh_token} ->
        # Get the user to check role
        case Accounts.get_user_by_username(username) do
          %{role: "admin", active: true} = user ->
            conn
            |> put_session(:admin_user_id, user.id)
            |> put_flash(:info, "Welcome back!")
            |> redirect(to: ~p"/admin/dashboard")

          _ ->
            conn
            |> put_flash(:error, "Access denied. Admin privileges required.")
            |> redirect(to: ~p"/admin/login")
        end

      {:error, _reason} ->
        conn
        |> put_flash(:error, "Invalid username or password")
        |> redirect(to: ~p"/admin/login")
    end
  end

  def delete(conn, _params) do
    conn
    |> clear_session()
    |> put_flash(:info, "You have been logged out successfully.")
    |> redirect(to: ~p"/admin/login")
  end
end
