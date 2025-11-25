defmodule EducationCrmWeb.Api.AuthController do
  @moduledoc """
  API controller for authentication endpoints.
  Handles login, token refresh, and logout operations.
  """
  use EducationCrmWeb, :controller

  alias EducationCrm.Accounts

  @doc """
  POST /api/auth/login
  Authenticates a user and returns JWT tokens.

  Request body:
    {
      "username": "string",
      "password": "string"
    }

  Response (200):
    {
      "data": {
        "access_token": "jwt_token",
        "refresh_token": "jwt_token",
        "token_type": "Bearer",
        "expires_in": 900
      }
    }

  Response (401):
    {
      "error": {
        "code": "AUTHENTICATION_ERROR",
        "message": "Invalid credentials"
      }
    }
  """
  def login(conn, %{"username" => username, "password" => password}) do
    case Accounts.authenticate(username, password) do
      {:ok, access_token, refresh_token} ->
        conn
        |> put_status(:ok)
        |> json(%{
          data: %{
            access_token: access_token,
            refresh_token: refresh_token,
            token_type: "Bearer",
            expires_in: 900
          }
        })

      {:error, :invalid_credentials} ->
        conn
        |> put_status(:unauthorized)
        |> json(%{
          error: %{
            code: "AUTHENTICATION_ERROR",
            message: "Invalid credentials"
          }
        })
    end
  end

  def login(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{
      error: %{
        code: "VALIDATION_ERROR",
        message: "Username and password are required"
      }
    })
  end

  @doc """
  POST /api/auth/refresh
  Refreshes an access token using a valid refresh token.

  Request body:
    {
      "refresh_token": "jwt_token"
    }

  Response (200):
    {
      "data": {
        "access_token": "new_jwt_token",
        "refresh_token": "new_refresh_token",
        "token_type": "Bearer",
        "expires_in": 900
      }
    }

  Response (401):
    {
      "error": {
        "code": "AUTHENTICATION_ERROR",
        "message": "Invalid or expired refresh token"
      }
    }
  """
  def refresh(conn, %{"refresh_token" => refresh_token}) do
    case Accounts.refresh_token(refresh_token) do
      {:ok, new_access_token, new_refresh_token} ->
        conn
        |> put_status(:ok)
        |> json(%{
          data: %{
            access_token: new_access_token,
            refresh_token: new_refresh_token,
            token_type: "Bearer",
            expires_in: 900
          }
        })

      {:error, _reason} ->
        conn
        |> put_status(:unauthorized)
        |> json(%{
          error: %{
            code: "AUTHENTICATION_ERROR",
            message: "Invalid or expired refresh token"
          }
        })
    end
  end

  def refresh(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{
      error: %{
        code: "VALIDATION_ERROR",
        message: "Refresh token is required"
      }
    })
  end

  @doc """
  POST /api/auth/logout
  Revokes the provided JWT token.

  Request headers:
    Authorization: Bearer <access_token>

  Response (200):
    {
      "data": {
        "message": "Successfully logged out"
      }
    }

  Response (401):
    {
      "error": {
        "code": "AUTHENTICATION_ERROR",
        "message": "Invalid or expired token"
      }
    }
  """
  def logout(conn, _params) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] ->
        case Accounts.revoke_token(token) do
          {:ok, _claims} ->
            conn
            |> put_status(:ok)
            |> json(%{
              data: %{
                message: "Successfully logged out"
              }
            })

          {:error, _reason} ->
            conn
            |> put_status(:unauthorized)
            |> json(%{
              error: %{
                code: "AUTHENTICATION_ERROR",
                message: "Invalid or expired token"
              }
            })
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
    end
  end
end
