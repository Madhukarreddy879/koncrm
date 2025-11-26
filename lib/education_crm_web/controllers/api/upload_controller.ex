defmodule EducationCrmWeb.Api.UploadController do
  @moduledoc """
  Controller for handling direct file uploads in development mode.
  This simulates S3 presigned URL uploads for local development.
  """
  use EducationCrmWeb, :controller

  @doc """
  PUT /api/uploads/*key
  Handles file uploads to simulate S3 presigned URL behavior.
  """
  def upload(conn, %{"key" => key_parts}) when is_list(key_parts) do
    # Join the key parts to get the full path
    key = Path.join(key_parts)
    do_upload(conn, key)
  end

  def upload(conn, %{"key" => key}) when is_binary(key) do
    do_upload(conn, key)
  end

  defp do_upload(conn, key) do
    # Read the request body
    {:ok, body, conn} = Plug.Conn.read_body(conn)

    # Ensure upload directory exists
    upload_path = Path.join(:code.priv_dir(:education_crm), "static/uploads")
    File.mkdir_p!(upload_path)

    # Create subdirectories if key contains slashes
    key_parts = String.split(key, "/")

    if length(key_parts) > 1 do
      subdir = key_parts |> Enum.slice(0..-2//1) |> Enum.join("/")
      File.mkdir_p!(Path.join(upload_path, subdir))
    end

    # Save file
    file_path = Path.join(upload_path, key)

    case File.write(file_path, body) do
      :ok ->
        conn
        |> put_status(:ok)
        |> text("Upload successful")

      {:error, reason} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{
          error: %{
            code: "UPLOAD_ERROR",
            message: "Failed to save file: #{inspect(reason)}"
          }
        })
    end
  end

  @doc """
  GET /uploads/*path
  Serves uploaded files in development mode.
  """
  def serve(conn, %{"path" => path}) do
    # Join path segments
    file_path = Path.join(path)
    upload_path = Path.join(:code.priv_dir(:education_crm), "static/uploads")
    full_path = Path.join(upload_path, file_path)

    if File.exists?(full_path) do
      content_type = determine_content_type(full_path)

      conn
      |> put_resp_content_type(content_type)
      |> put_resp_header("accept-ranges", "bytes")
      |> send_file(200, full_path)
    else
      conn
      |> put_status(:not_found)
      |> json(%{
        error: %{
          code: "NOT_FOUND",
          message: "File not found"
        }
      })
    end
  end

  defp determine_content_type(file_path) do
    case Path.extname(file_path) do
      ".aac" -> "audio/aac"
      ".mp3" -> "audio/mpeg"
      ".m4a" -> "audio/mp4"
      ".wav" -> "audio/wav"
      ".ogg" -> "audio/ogg"
      _ -> "audio/aac"
    end
  end
end
