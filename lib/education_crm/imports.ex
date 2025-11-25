defmodule EducationCrm.Imports do
  @moduledoc """
  The Imports context - manages CSV imports and audit logs.
  """

  import Ecto.Query, warn: false
  alias EducationCrm.Repo
  alias EducationCrm.Imports.ImportLog
  alias EducationCrm.Leads

  NimbleCSV.define(CSVParser, separator: ",", escape: "\"")

  @doc """
  Parses a CSV file and validates required fields.

  Returns a tuple with success and error lists.

  ## Examples

      iex> parse_csv("/path/to/file.csv")
      {:ok, %{
        valid: [%{student_name: "John", phone_number: "1234567890"}],
        invalid: [%{row: 2, errors: ["phone_number is required"]}]
      }}

      iex> parse_csv("/invalid/path.csv")
      {:error, :file_not_found}

  """
  def parse_csv(file_path) do
    case File.read(file_path) do
      {:ok, content} ->
        parse_csv_content(content)

      {:error, :enoent} ->
        {:error, :file_not_found}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc """
  Parses CSV content from a string.

  Returns a tuple with success and error lists.

  ## Examples

      iex> parse_csv_content("name,phone\\nJohn,1234567890")
      {:ok, %{
        valid: [%{student_name: "John", phone_number: "1234567890"}],
        invalid: []
      }}

  """
  def parse_csv_content(content) when is_binary(content) do
    rows =
      content
      |> CSVParser.parse_string(skip_headers: false)

    case rows do
      [] ->
        {:ok, %{valid: [], invalid: []}}

      [headers | data_rows] ->
        normalized_headers = normalize_headers(headers)
        validate_headers(normalized_headers, data_rows)
    end
  end

  defp normalize_headers(headers) do
    Enum.map(headers, fn header ->
      header
      |> String.trim()
      |> String.downcase()
    end)
  end

  defp validate_headers(headers, data_rows) do
    name_index = Enum.find_index(headers, &(&1 in ["name", "student_name", "student name"]))
    phone_index = Enum.find_index(headers, &(&1 in ["phone", "phone_number", "phone number"]))

    cond do
      is_nil(name_index) ->
        {:error, :missing_name_column}

      is_nil(phone_index) ->
        {:error, :missing_phone_column}

      true ->
        result = validate_rows(data_rows, name_index, phone_index)
        {:ok, result}
    end
  end

  defp validate_rows(data_rows, name_index, phone_index) do
    data_rows
    |> Enum.with_index(2)
    |> Enum.reduce(%{valid: [], invalid: []}, fn {row, row_number}, acc ->
      name = Enum.at(row, name_index) |> to_string() |> String.trim()
      phone = Enum.at(row, phone_index) |> to_string() |> String.trim()

      errors = validate_row_data(name, phone)

      if errors == [] do
        lead = %{
          student_name: name,
          phone_number: phone
        }

        %{acc | valid: [lead | acc.valid]}
      else
        error = %{row: row_number, errors: errors}
        %{acc | invalid: [error | acc.invalid]}
      end
    end)
    |> then(fn result ->
      %{
        valid: Enum.reverse(result.valid),
        invalid: Enum.reverse(result.invalid)
      }
    end)
  end

  defp validate_row_data(name, phone) do
    errors = []

    errors =
      if name == "" do
        ["student_name is required" | errors]
      else
        errors
      end

    errors =
      if phone == "" do
        ["phone_number is required" | errors]
      else
        errors
      end

    errors =
      if phone != "" && !valid_phone_format?(phone) do
        ["phone_number has invalid format" | errors]
      else
        errors
      end

    Enum.reverse(errors)
  end

  defp valid_phone_format?(phone) do
    # Basic validation: 10-15 digits, may contain +, spaces, hyphens, parentheses
    cleaned = String.replace(phone, ~r/[\s\-\(\)]/, "")
    String.match?(cleaned, ~r/^\+?\d{10,15}$/)
  end

  @doc """
  Imports leads from CSV file with distribution and logging.

  Combines parsing, validation, distribution, and bulk creation.
  Creates an import log record with success/error counts.

  ## Parameters

    * `file_path` - Path to CSV file or CSV content string
    * `telecaller_ids` - List of telecaller IDs to distribute leads to
    * `branch_id` - Branch ID for the leads
    * `admin_id` - Admin user ID performing the import
    * `filename` - Original filename for logging

  ## Returns

    * `{:ok, summary}` - Import successful with summary map
    * `{:error, reason}` - Import failed

  ## Examples

      iex> import_leads("/path/to/file.csv", [tc1_id, tc2_id], branch_id, admin_id, "leads.csv")
      {:ok, %{
        total_rows: 100,
        successful_rows: 95,
        failed_rows: 5,
        telecaller_distribution: %{tc1_id => 48, tc2_id => 47},
        errors: [%{row: 2, errors: ["phone_number is required"]}]
      }}

  """
  def import_leads(file_path_or_content, telecaller_ids, branch_id, admin_id, filename)
      when is_list(telecaller_ids) and length(telecaller_ids) > 0 do
    Repo.transaction(fn ->
      # Step 1: Parse and validate CSV
      parse_result =
        if File.exists?(file_path_or_content) do
          parse_csv(file_path_or_content)
        else
          parse_csv_content(file_path_or_content)
        end

      case parse_result do
        {:ok, %{valid: valid_leads, invalid: invalid_rows}} ->
          total_rows = length(valid_leads) + length(invalid_rows)

          # Step 2: Distribute leads to telecallers
          distributed_leads = Leads.distribute_leads(valid_leads, telecaller_ids)

          # Step 3: Bulk create leads
          {:ok, inserted_count} = Leads.bulk_create_leads(distributed_leads, branch_id)

          # Step 4: Calculate per-telecaller distribution
          telecaller_distribution = calculate_distribution(distributed_leads)

          # Step 5: Create import log
          error_details =
            if invalid_rows == [] do
              nil
            else
              %{errors: invalid_rows}
            end

          import_log_attrs = %{
            filename: filename,
            total_rows: total_rows,
            successful_rows: inserted_count,
            failed_rows: length(invalid_rows),
            error_details: error_details,
            branch_id: branch_id,
            admin_id: admin_id
          }

          case create_import_log(import_log_attrs) do
            {:ok, _log} ->
              %{
                total_rows: total_rows,
                successful_rows: inserted_count,
                failed_rows: length(invalid_rows),
                telecaller_distribution: telecaller_distribution,
                errors: invalid_rows
              }

            {:error, changeset} ->
              Repo.rollback(changeset)
          end

        {:error, reason} ->
          Repo.rollback(reason)
      end
    end)
  end

  defp calculate_distribution(distributed_leads) do
    distributed_leads
    |> Enum.reduce(%{}, fn lead, acc ->
      telecaller_id = lead.telecaller_id
      Map.update(acc, telecaller_id, 1, &(&1 + 1))
    end)
  end

  @doc """
  Creates an import log record.

  ## Examples

      iex> create_import_log(%{filename: "leads.csv", total_rows: 100, ...})
      {:ok, %ImportLog{}}

      iex> create_import_log(%{})
      {:error, %Ecto.Changeset{}}

  """
  def create_import_log(attrs) do
    %ImportLog{}
    |> ImportLog.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Lists import logs for a branch with optional pagination.

  ## Examples

      iex> list_import_logs(branch_id: branch_id)
      [%ImportLog{}, ...]

      iex> list_import_logs(branch_id: branch_id, limit: 10)
      [%ImportLog{}, ...]

  """
  def list_import_logs(opts) do
    branch_id = Keyword.fetch!(opts, :branch_id)
    limit = Keyword.get(opts, :limit, 50)

    ImportLog
    |> where([i], i.branch_id == ^branch_id)
    |> order_by([i], desc: i.inserted_at)
    |> limit(^limit)
    |> preload([:admin, :branch])
    |> Repo.all()
  end

  @doc """
  Gets a single import log by ID.

  ## Examples

      iex> get_import_log(id)
      %ImportLog{}

      iex> get_import_log(invalid_id)
      nil

  """
  def get_import_log(id) do
    ImportLog
    |> preload([:admin, :branch])
    |> Repo.get(id)
  end
end
