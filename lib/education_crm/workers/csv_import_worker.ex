defmodule EducationCrm.Workers.CsvImportWorker do
  @moduledoc """
  Oban worker for processing CSV imports asynchronously.

  This worker handles the background processing of CSV file imports,
  including parsing, validation, lead distribution, and bulk creation.
  """

  use Oban.Worker,
    queue: :csv_import,
    max_attempts: 3

  alias EducationCrm.Imports

  @doc """
  Performs the CSV import job.

  ## Job Args

    * `file_path` - Path to the CSV file or CSV content string
    * `telecaller_ids` - List of telecaller IDs to distribute leads to
    * `branch_id` - Branch ID for the leads
    * `admin_id` - Admin user ID performing the import
    * `filename` - Original filename for logging

  ## Returns

    * `:ok` - Import successful
    * `{:error, reason}` - Import failed
    * `{:cancel, reason}` - Job cancelled (will not retry)
  """
  @impl Oban.Worker
  def perform(%Oban.Job{
        args: %{
          "file_path" => file_path,
          "telecaller_ids" => telecaller_ids,
          "branch_id" => branch_id,
          "admin_id" => admin_id,
          "filename" => filename
        }
      }) do
    case Imports.import_leads(file_path, telecaller_ids, branch_id, admin_id, filename) do
      {:ok, _summary} ->
        # Clean up temporary file if it exists
        cleanup_temp_file(file_path)
        :ok

      {:error, reason} ->
        cleanup_temp_file(file_path)
        {:error, reason}
    end
  end

  @doc """
  Enqueues a CSV import job.

  ## Examples

      iex> CsvImportWorker.enqueue(%{
      ...>   file_path: "/tmp/leads.csv",
      ...>   telecaller_ids: [tc1_id, tc2_id],
      ...>   branch_id: branch_id,
      ...>   admin_id: admin_id,
      ...>   filename: "leads.csv"
      ...> })
      {:ok, %Oban.Job{}}
  """
  def enqueue(args) do
    args
    |> new()
    |> Oban.insert()
  end

  defp cleanup_temp_file(file_path) do
    if String.starts_with?(file_path, System.tmp_dir!()) and File.exists?(file_path) do
      File.rm(file_path)
    end
  end
end
