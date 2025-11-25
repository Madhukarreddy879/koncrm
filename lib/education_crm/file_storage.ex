defmodule EducationCrm.FileStorage do
  @moduledoc """
  Handles file storage operations for call recordings.
  Supports chunked uploads for large audio files.
  """

  @doc """
  Initializes a chunked upload session.

  Returns {:ok, upload_id} where upload_id is a unique identifier for the upload session.

  ## Examples

      iex> init_chunked_upload("recording.aac", "call_log_id")
      {:ok, "upload_session_id"}

  """
  def init_chunked_upload(filename, call_log_id) do
    upload_id = generate_upload_id()
    temp_dir = get_temp_upload_dir(upload_id)
    File.mkdir_p!(temp_dir)

    metadata = %{
      upload_id: upload_id,
      filename: filename,
      call_log_id: call_log_id,
      chunks_received: 0,
      created_at: DateTime.utc_now()
    }

    metadata_path = Path.join(temp_dir, "metadata.json")
    File.write!(metadata_path, Jason.encode!(metadata))

    {:ok, upload_id}
  end

  @doc """
  Appends a chunk to an ongoing upload session.

  ## Examples

      iex> append_chunk("upload_id", 0, <<binary_data>>)
      {:ok, %{chunks_received: 1, total_size: 1048576}}

      iex> append_chunk("invalid_id", 0, <<binary_data>>)
      {:error, :upload_not_found}

  """
  def append_chunk(upload_id, chunk_index, chunk_data) do
    temp_dir = get_temp_upload_dir(upload_id)
    metadata_path = Path.join(temp_dir, "metadata.json")

    if File.exists?(metadata_path) do
      chunk_path = Path.join(temp_dir, "chunk_#{chunk_index}")
      File.write!(chunk_path, chunk_data)

      # Update metadata
      metadata =
        metadata_path
        |> File.read!()
        |> Jason.decode!()
        |> Map.update!("chunks_received", &(&1 + 1))

      File.write!(metadata_path, Jason.encode!(metadata))

      total_size = calculate_upload_size(temp_dir)

      {:ok, %{chunks_received: metadata["chunks_received"], total_size: total_size}}
    else
      {:error, :upload_not_found}
    end
  end

  @doc """
  Finalizes a chunked upload by combining all chunks into a single file.

  Returns {:ok, file_path} on success.

  ## Examples

      iex> finalize_chunked_upload("upload_id", 5)
      {:ok, "priv/static/recordings/call_log_id_timestamp.aac"}

      iex> finalize_chunked_upload("upload_id", 3)
      {:error, :incomplete_upload}

  """
  def finalize_chunked_upload(upload_id, expected_chunks) do
    temp_dir = get_temp_upload_dir(upload_id)
    metadata_path = Path.join(temp_dir, "metadata.json")

    if File.exists?(metadata_path) do
      metadata =
        metadata_path
        |> File.read!()
        |> Jason.decode!()

      if metadata["chunks_received"] == expected_chunks do
        # Combine chunks into final file
        recordings_dir = get_recordings_dir()
        File.mkdir_p!(recordings_dir)

        timestamp = DateTime.utc_now() |> DateTime.to_unix()
        extension = Path.extname(metadata["filename"])
        final_filename = "#{metadata["call_log_id"]}_#{timestamp}#{extension}"
        final_path = Path.join(recordings_dir, final_filename)

        # Combine all chunks in order
        File.open!(final_path, [:write, :binary], fn file ->
          Enum.each(0..(expected_chunks - 1), fn chunk_index ->
            chunk_path = Path.join(temp_dir, "chunk_#{chunk_index}")

            if File.exists?(chunk_path) do
              chunk_data = File.read!(chunk_path)
              IO.binwrite(file, chunk_data)
            end
          end)
        end)

        # Clean up temp directory
        File.rm_rf!(temp_dir)

        {:ok, final_path}
      else
        {:error, :incomplete_upload}
      end
    else
      {:error, :upload_not_found}
    end
  end

  @doc """
  Handles a simple (non-chunked) file upload.

  ## Examples

      iex> save_recording(%Plug.Upload{}, "call_log_id")
      {:ok, "priv/static/recordings/call_log_id_timestamp.aac"}

  """
  def save_recording(%Plug.Upload{} = upload, call_log_id) do
    recordings_dir = get_recordings_dir()
    File.mkdir_p!(recordings_dir)

    timestamp = DateTime.utc_now() |> DateTime.to_unix()
    extension = Path.extname(upload.filename)
    filename = "#{call_log_id}_#{timestamp}#{extension}"
    destination = Path.join(recordings_dir, filename)

    case File.cp(upload.path, destination) do
      :ok -> {:ok, destination}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Deletes a recording file.

  ## Examples

      iex> delete_recording("priv/static/recordings/file.aac")
      :ok

  """
  def delete_recording(file_path) do
    if File.exists?(file_path) do
      File.rm(file_path)
    else
      :ok
    end
  end

  @doc """
  Cancels an ongoing chunked upload and cleans up temporary files.

  ## Examples

      iex> cancel_chunked_upload("upload_id")
      :ok

  """
  def cancel_chunked_upload(upload_id) do
    temp_dir = get_temp_upload_dir(upload_id)

    if File.exists?(temp_dir) do
      File.rm_rf!(temp_dir)
    end

    :ok
  end

  # Private helper functions

  defp generate_upload_id do
    :crypto.strong_rand_bytes(16) |> Base.url_encode64(padding: false)
  end

  defp get_temp_upload_dir(upload_id) do
    base_dir = System.tmp_dir!()
    Path.join([base_dir, "education_crm_uploads", upload_id])
  end

  defp get_recordings_dir do
    Application.get_env(:education_crm, :recordings_path, "priv/static/recordings")
  end

  defp calculate_upload_size(temp_dir) do
    temp_dir
    |> File.ls!()
    |> Enum.filter(&String.starts_with?(&1, "chunk_"))
    |> Enum.reduce(0, fn chunk_file, acc ->
      chunk_path = Path.join(temp_dir, chunk_file)
      %{size: size} = File.stat!(chunk_path)
      acc + size
    end)
  end
end
