defmodule EducationCrmWeb.Api.CallController do
  @moduledoc """
  API controller for call logging and recording management.
  Handles logging call attempts and managing call recordings.
  """
  use EducationCrmWeb, :controller

  alias EducationCrm.Leads
  alias EducationCrm.FileStorage

  plug EducationCrmWeb.Plugs.ApiAuth

  @doc """
  POST /api/leads/:lead_id/calls
  Logs a call attempt for a lead.

  Request body:
    {
      "outcome": "connected" | "no_answer" | "busy" | "invalid_number",
      "duration_seconds": integer (optional)
    }

  Response (201):
    {
      "data": {
        "id": "uuid",
        "outcome": "string",
        "duration_seconds": integer,
        "recording_path": null,
        "inserted_at": "datetime"
      }
    }

  Response (422):
    {
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": {...}
      }
    }
  """
  def create(conn, %{"lead_id" => lead_id} = params) do
    telecaller_id = conn.assigns.current_telecaller_id

    # Verify lead belongs to telecaller
    case Leads.get_lead_by(id: lead_id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{
          error: %{
            code: "NOT_FOUND",
            message: "Lead not found"
          }
        })

      lead ->
        if lead.telecaller_id == telecaller_id do
          call_attrs = extract_call_attrs(params)

          case Leads.log_call(lead_id, call_attrs, telecaller_id) do
            {:ok, call_log} ->
              conn
              |> put_status(:created)
              |> json(%{
                data: format_call_log(call_log)
              })

            {:error, %Ecto.Changeset{} = changeset} ->
              conn
              |> put_status(:unprocessable_entity)
              |> json(%{
                error: %{
                  code: "VALIDATION_ERROR",
                  message: "Validation failed",
                  details: format_changeset_errors(changeset)
                }
              })
          end
        else
          conn
          |> put_status(:forbidden)
          |> json(%{
            error: %{
              code: "AUTHORIZATION_ERROR",
              message: "You are not authorized to log calls for this lead"
            }
          })
        end
    end
  end

  alias EducationCrm.Services.S3Service

  @doc """
  POST /api/leads/:lead_id/recordings/presign
  Generates a presigned URL for uploading a recording directly to S3 (or local storage).

  Request body:
    {
      "filename": "string" (required),
      "content_type": "string" (optional, default: audio/aac)
    }

  Response (200):
    {
      "data": {
        "upload_url": "string",
        "key": "string",
        "public_url": "string"
      }
    }
  """
  def presign_upload(conn, %{"lead_id" => lead_id} = params) do
    telecaller_id = conn.assigns.current_telecaller_id

    case verify_lead_access(lead_id, telecaller_id) do
      {:ok, _lead} ->
        with {:ok, filename} <- get_required_param(params, "filename") do
          content_type = Map.get(params, "content_type", "audio/aac")
          
          # Generate a unique key
          uuid = Ecto.UUID.generate()
          ext = Path.extname(filename)
          key = "recordings/#{uuid}#{ext}"

          case S3Service.presigned_put_url(key, content_type) do
            {:ok, upload_url} ->
              public_url = S3Service.format_key(key)
              
              conn
              |> json(%{
                data: %{
                  upload_url: upload_url,
                  key: key,
                  public_url: public_url
                }
              })
              
            {:error, reason} ->
              conn
              |> put_status(:internal_server_error)
              |> json(%{
                error: %{
                  code: "SERVER_ERROR",
                  message: "Failed to generate upload URL: #{inspect(reason)}"
                }
              })
          end
        else
          {:error, field} ->
            conn
            |> put_status(:bad_request)
            |> json(%{
              error: %{
                code: "VALIDATION_ERROR",
                message: "#{field} is required"
              }
            })
        end

      {:error, status, error} ->
        conn
        |> put_status(status)
        |> json(error)
    end
  end

  @doc """
  POST /api/leads/:lead_id/recordings
  Uploads a call recording file with support for chunked uploads.

  For simple upload (multipart/form-data):
    - file: audio file (required)
    - call_log_id: UUID of the call log (required)

  For chunked upload initialization:
    - action: "init"
    - filename: original filename (required)
    - call_log_id: UUID of the call log (required)

  For chunked upload append:
    - action: "append"
    - upload_id: session ID from init (required)
    - chunk_index: zero-based chunk index (required)
    - chunk: binary chunk data (required)

  For chunked upload finalization:
    - action: "finalize"
    - upload_id: session ID from init (required)
    - total_chunks: total number of chunks (required)
    - call_log_id: UUID of the call log (required)

  Response (200):
    {
      "data": {
        "id": "uuid",
        "recording_path": "string",
        "message": "Recording uploaded successfully"
      }
    }

  Response (202) for chunk append:
    {
      "data": {
        "upload_id": "string",
        "chunks_received": integer,
        "total_size": integer
      }
    }

  Response (201) for init:
    {
      "data": {
        "upload_id": "string",
        "message": "Upload session initialized"
      }
    }
  """
  def upload_recording(conn, %{"lead_id" => lead_id, "action" => "init"} = params) do
    telecaller_id = conn.assigns.current_telecaller_id

    case verify_lead_access(lead_id, telecaller_id) do
      {:ok, _lead} ->
        with {:ok, filename} <- get_required_param(params, "filename"),
             {:ok, call_log_id} <- get_required_param(params, "call_log_id") do
          {:ok, upload_id} = FileStorage.init_chunked_upload(filename, call_log_id)

          conn
          |> put_status(:created)
          |> json(%{
            data: %{
              upload_id: upload_id,
              message: "Upload session initialized"
            }
          })
        else
          {:error, field} ->
            conn
            |> put_status(:bad_request)
            |> json(%{
              error: %{
                code: "VALIDATION_ERROR",
                message: "#{field} is required"
              }
            })
        end

      {:error, status, error} ->
        conn
        |> put_status(status)
        |> json(error)
    end
  end

  def upload_recording(conn, %{"lead_id" => lead_id, "action" => "append"} = params) do
    telecaller_id = conn.assigns.current_telecaller_id

    case verify_lead_access(lead_id, telecaller_id) do
      {:ok, _lead} ->
        with {:ok, upload_id} <- get_required_param(params, "upload_id"),
             {:ok, chunk_index} <- get_required_param(params, "chunk_index"),
             {:ok, chunk_data} <- get_chunk_data(params) do
          chunk_index_int = parse_integer(chunk_index)

          case FileStorage.append_chunk(upload_id, chunk_index_int, chunk_data) do
            {:ok, status} ->
              conn
              |> put_status(:accepted)
              |> json(%{
                data: Map.put(status, :upload_id, upload_id)
              })

            {:error, :upload_not_found} ->
              conn
              |> put_status(:not_found)
              |> json(%{
                error: %{
                  code: "NOT_FOUND",
                  message: "Upload session not found"
                }
              })
          end
        else
          {:error, field} ->
            conn
            |> put_status(:bad_request)
            |> json(%{
              error: %{
                code: "VALIDATION_ERROR",
                message: "#{field} is required"
              }
            })
        end

      {:error, status, error} ->
        conn
        |> put_status(status)
        |> json(error)
    end
  end

  def upload_recording(conn, %{"lead_id" => lead_id, "action" => "finalize"} = params) do
    telecaller_id = conn.assigns.current_telecaller_id

    case verify_lead_access(lead_id, telecaller_id) do
      {:ok, _lead} ->
        with {:ok, upload_id} <- get_required_param(params, "upload_id"),
             {:ok, total_chunks} <- get_required_param(params, "total_chunks"),
             {:ok, call_log_id} <- get_required_param(params, "call_log_id") do
          total_chunks_int = parse_integer(total_chunks)

          case FileStorage.finalize_chunked_upload(upload_id, total_chunks_int) do
            {:ok, file_path} ->
              handle_recording_attachment(conn, call_log_id, file_path)

            {:error, :upload_not_found} ->
              conn
              |> put_status(:not_found)
              |> json(%{
                error: %{
                  code: "NOT_FOUND",
                  message: "Upload session not found"
                }
              })

            {:error, :incomplete_upload} ->
              conn
              |> put_status(:bad_request)
              |> json(%{
                error: %{
                  code: "VALIDATION_ERROR",
                  message: "Incomplete upload - not all chunks received"
                }
              })
          end
        else
          {:error, field} ->
            conn
            |> put_status(:bad_request)
            |> json(%{
              error: %{
                code: "VALIDATION_ERROR",
                message: "#{field} is required"
              }
            })
        end

      {:error, status, error} ->
        conn
        |> put_status(status)
        |> json(error)
    end
  end

  def upload_recording(conn, %{"lead_id" => lead_id, "call_log_id" => call_log_id, "s3_key" => s3_key}) do
    telecaller_id = conn.assigns.current_telecaller_id

    case verify_lead_access(lead_id, telecaller_id) do
      {:ok, _lead} ->
        # For S3 uploads, we just attach the public URL (or key) to the call log
        # In a real app, we might want to verify the file exists on S3 first
        # Store the S3 key with a prefix so we know it's an S3 file
        file_path = S3Service.format_key(s3_key)
        handle_recording_attachment(conn, call_log_id, file_path)

      {:error, status, error} ->
        conn
        |> put_status(status)
        |> json(error)
    end
  end

  def upload_recording(conn, %{"lead_id" => lead_id, "call_log_id" => call_log_id} = params) do
    telecaller_id = conn.assigns.current_telecaller_id

    case verify_lead_access(lead_id, telecaller_id) do
      {:ok, _lead} ->
        case params["file"] do
          %Plug.Upload{} = upload ->
            handle_simple_upload(conn, call_log_id, upload)

          nil ->
            conn
            |> put_status(:bad_request)
            |> json(%{
              error: %{
                code: "VALIDATION_ERROR",
                message: "File or s3_key is required"
              }
            })
        end

      {:error, status, error} ->
        conn
        |> put_status(status)
        |> json(error)
    end
  end

  def upload_recording(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{
      error: %{
        code: "VALIDATION_ERROR",
        message: "Invalid request parameters"
      }
    })
  end

  @doc """
  GET /api/leads/:lead_id/recordings/:recording_id
  Streams a call recording file with range support for partial content delivery.

  Supports HTTP Range requests for efficient audio streaming.

  Response (200): Full audio file stream
  Response (206): Partial content (when Range header is present)
  Response (404): Recording not found
  Response (403): Not authorized
  """
  def show_recording(conn, %{"lead_id" => lead_id, "recording_id" => recording_id}) do
    telecaller_id = conn.assigns.current_telecaller_id

    case verify_lead_access(lead_id, telecaller_id) do
      {:ok, lead} ->
        call_log = Enum.find(lead.call_logs || [], fn cl -> cl.id == recording_id end)

        case call_log do
          nil ->
            conn
            |> put_status(:not_found)
            |> json(%{
              error: %{
                code: "NOT_FOUND",
                message: "Recording not found"
              }
            })

          %{recording_path: nil} ->
            conn
            |> put_status(:not_found)
            |> json(%{
              error: %{
                code: "NOT_FOUND",
                message: "Recording not found"
              }
            })

          %{recording_path: "s3:" <> key} ->
            # It's an S3 file, generate presigned URL and redirect
            case S3Service.presigned_get_url(key) do
              {:ok, url} ->
                redirect(conn, external: url)
              
              {:error, _reason} ->
                conn
                |> put_status(:internal_server_error)
                |> json(%{
                  error: %{
                    code: "SERVER_ERROR",
                    message: "Failed to generate playback URL"
                  }
                })
            end

          %{recording_path: path} ->
            if File.exists?(path) do
              stream_recording(conn, path)
            else
              conn
              |> put_status(:not_found)
              |> json(%{
                error: %{
                  code: "NOT_FOUND",
                  message: "Recording file not found"
                }
              })
            end
        end

      {:error, status, error} ->
        conn
        |> put_status(status)
        |> json(error)
    end
  end

  defp stream_recording(conn, file_path) do
    file_stat = File.stat!(file_path)
    file_size = file_stat.size

    content_type = determine_content_type(file_path)

    case get_req_header(conn, "range") do
      [] ->
        # No range header - send full file
        conn
        |> put_resp_content_type(content_type)
        |> put_resp_header("accept-ranges", "bytes")
        |> put_resp_header("content-length", to_string(file_size))
        |> send_file(200, file_path)

      [range_header] ->
        # Parse range header and send partial content
        case parse_range_header(range_header, file_size) do
          {:ok, range_start, range_end} ->
            content_length = range_end - range_start + 1

            conn
            |> put_resp_content_type(content_type)
            |> put_resp_header("accept-ranges", "bytes")
            |> put_resp_header("content-range", "bytes #{range_start}-#{range_end}/#{file_size}")
            |> put_resp_header("content-length", to_string(content_length))
            |> send_file(206, file_path, range_start, content_length)

          :error ->
            conn
            |> put_status(:requested_range_not_satisfiable)
            |> put_resp_header("content-range", "bytes */#{file_size}")
            |> json(%{
              error: %{
                code: "INVALID_RANGE",
                message: "Invalid range request"
              }
            })
        end
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

  defp parse_range_header("bytes=" <> range, file_size) do
    case String.split(range, "-", parts: 2) do
      [start_str, end_str] ->
        start = parse_range_value(start_str, 0)
        end_val = parse_range_value(end_str, file_size - 1)

        if start >= 0 and end_val >= start and end_val < file_size do
          {:ok, start, end_val}
        else
          :error
        end

      _ ->
        :error
    end
  end

  defp parse_range_header(_, _), do: :error

  defp parse_range_value("", default), do: default

  defp parse_range_value(str, _default) do
    case Integer.parse(str) do
      {num, _} -> num
      :error -> -1
    end
  end

  # Private helper functions

  defp extract_call_attrs(params) do
    attrs = %{}

    attrs =
      if params["outcome"] do
        Map.put(attrs, :outcome, params["outcome"])
      else
        attrs
      end

    attrs =
      if params["duration_seconds"] do
        Map.put(attrs, :duration_seconds, params["duration_seconds"])
      else
        attrs
      end

    attrs
  end

  defp verify_lead_access(lead_id, telecaller_id) do
    case Leads.get_lead_by(id: lead_id) do
      nil ->
        {:error, :not_found,
         %{
           error: %{
             code: "NOT_FOUND",
             message: "Lead not found"
           }
         }}

      lead ->
        if lead.telecaller_id == telecaller_id do
          {:ok, lead}
        else
          {:error, :forbidden,
           %{
             error: %{
               code: "AUTHORIZATION_ERROR",
               message: "You are not authorized to access this lead"
             }
           }}
        end
    end
  end

  defp get_required_param(params, key) do
    case params[key] do
      nil -> {:error, key}
      "" -> {:error, key}
      value -> {:ok, value}
    end
  end

  defp get_chunk_data(%{"chunk" => chunk}) when is_binary(chunk), do: {:ok, chunk}

  defp get_chunk_data(%{"file" => %Plug.Upload{path: path}}) do
    {:ok, File.read!(path)}
  end

  defp get_chunk_data(_), do: {:error, "chunk"}

  defp parse_integer(value) when is_integer(value), do: value
  defp parse_integer(value) when is_binary(value), do: String.to_integer(value)

  defp handle_simple_upload(conn, call_log_id, upload) do
    case FileStorage.save_recording(upload, call_log_id) do
      {:ok, file_path} ->
        handle_recording_attachment(conn, call_log_id, file_path)

      {:error, reason} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{
          error: %{
            code: "SERVER_ERROR",
            message: "Failed to save recording: #{inspect(reason)}"
          }
        })
    end
  end

  defp handle_recording_attachment(conn, call_log_id, file_path) do
    case Leads.attach_recording(call_log_id, file_path) do
      {:ok, _call_log} ->
        conn
        |> put_status(:ok)
        |> json(%{
          data: %{
            id: call_log_id,
            recording_path: file_path,
            message: "Recording uploaded successfully"
          }
        })

      {:error, :not_found} ->
        FileStorage.delete_recording(file_path)

        conn
        |> put_status(:not_found)
        |> json(%{
          error: %{
            code: "NOT_FOUND",
            message: "Call log not found"
          }
        })

      {:error, %Ecto.Changeset{} = changeset} ->
        FileStorage.delete_recording(file_path)

        conn
        |> put_status(:unprocessable_entity)
        |> json(%{
          error: %{
            code: "VALIDATION_ERROR",
            message: "Failed to attach recording",
            details: format_changeset_errors(changeset)
          }
        })
    end
  end

  defp format_call_log(call_log) do
    %{
      id: call_log.id,
      outcome: call_log.outcome,
      duration_seconds: call_log.duration_seconds,
      recording_path: call_log.recording_path,
      inserted_at: call_log.inserted_at
    }
  end

  defp format_changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
