defmodule EducationCrmWeb.Plugs.ApiAuth do
  @moduledoc """
  Plug for authenticating API requests using JWT tokens.
  Extracts the token from the Authorization header and verifies it.
  """
  import Plug.Conn
  import Phoenix.Controller

  alias EducationCrm.Accounts

  def init(opts), do: opts

  def call(conn, _opts) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] ->
        case Accounts.verify_token(token) do
          {:ok, user} ->
            conn
            |> assign(:current_user, user)
            |> assign(:current_telecaller_id, user.id)

          {:error, _reason} ->
            conn
            |> put_status(:unauthorized)
            |> json(%{
              error: %{
                code: "AUTHENTICATION_ERROR",
                message: "Invalid or expired token"
              }
            })
            |> halt()
        end

      _ ->
        conn
        |> put_status(:unauthorized)
        |> json(%{
          error: %{
            code: "AUTHENTICATION_ERROR",
            message: "Authorization header is required"
          }
        })
        |> halt()
    end
  end
end
