defmodule EducationCrm.Workers.RecordingProcessorWorker do
  @moduledoc """
  Oban worker for processing call recording files asynchronously.

  This worker handles background processing of uploaded call recordings,
  including finalization of chunked uploads, file validation, and
  attachment to call logs.
  """

  use Oban.Worker,
    queue: :recordings,
    max_attempts: 3

  alias EducationCrm.FileStorage
  alias EducationCrm.Leads

  @doc """
  Performs the recording processing job.

  ## Job Args

    * `upload_id` - Unique identifier for the chunked upload session
    * `expected_chunks` - Total number of chunks expected
    * `call_log_id` - Call log ID to attach the recording to

  ## Returns

    * `:ok` - Processing successful
    * `{:error, reason}` - Processing failed
    * `{:cancel, reason}` - Job cancelled (will not retry)
  """
  @impl Oban.Worker
  def perform(%Oban.Job{
        args: %{
          "upload_id" => upload_id,
          "expected_chunks" => expected_chunks,
          "call_log_id" => call_log_id
        }
      }) do
    case FileStorage.finalize_chunked_upload(upload_id, expected_chunks) do
      {:ok, file_path} ->
        # Attach recording to call log
        case Leads.attach_recording(call_log_id, file_path) do
          {:ok, _call_log} ->
            :ok

          {:error, :not_found} ->
            # Call log not found, clean up the file
            FileStorage.delete_recording(file_path)
            {:cancel, :call_log_not_found}

          {:error, reason} ->
            {:error, reason}
        end

      {:error, :incomplete_upload} ->
        # Cancel upload and clean up
        FileStorage.cancel_chunked_upload(upload_id)
        {:cancel, :incomplete_upload}

      {:error, :upload_not_found} ->
        {:cancel, :upload_not_found}
    end
  end

  # Handles simple (non-chunked) recording processing
  def perform(%Oban.Job{
        args: %{
          "temp_file_path" => temp_file_path,
          "call_log_id" => call_log_id,
          "filename" => filename
        }
      }) do
    # Create a Plug.Upload struct for compatibility
    upload = %Plug.Upload{
      path: temp_file_path,
      filename: filename
    }

    case FileStorage.save_recording(upload, call_log_id) do
      {:ok, file_path} ->
        # Attach recording to call log
        case Leads.attach_recording(call_log_id, file_path) do
          {:ok, _call_log} ->
            # Clean up temp file
            File.rm(temp_file_path)
            :ok

          {:error, :not_found} ->
            # Call log not found, clean up files
            FileStorage.delete_recording(file_path)
            File.rm(temp_file_path)
            {:cancel, :call_log_not_found}

          {:error, reason} ->
            File.rm(temp_file_path)
            {:error, reason}
        end

      {:error, reason} ->
        File.rm(temp_file_path)
        {:error, reason}
    end
  end

  @doc """
  Enqueues a chunked recording processing job.

  ## Examples

      iex> RecordingProcessorWorker.enqueue_chunked(%{
      ...>   upload_id: "upload_session_id",
      ...>   expected_chunks: 5,
      ...>   call_log_id: "call_log_id"
      ...> })
      {:ok, %Oban.Job{}}
  """
  def enqueue_chunked(args) do
    args
    |> new()
    |> Oban.insert()
  end

  @doc """
  Enqueues a simple recording processing job.

  ## Examples

      iex> RecordingProcessorWorker.enqueue_simple(%{
      ...>   temp_file_path: "/tmp/recording.aac",
      ...>   call_log_id: "call_log_id",
      ...>   filename: "recording.aac"
      ...> })
      {:ok, %Oban.Job{}}
  """
  def enqueue_simple(args) do
    args
    |> new()
    |> Oban.insert()
  end
end
