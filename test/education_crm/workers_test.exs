defmodule EducationCrm.WorkersTest do
  use EducationCrm.DataCase, async: true
  use Oban.Testing, repo: EducationCrm.Repo

  alias EducationCrm.Workers.{CsvImportWorker, RecordingProcessorWorker}
  alias EducationCrm.{Accounts, Branches, Leads, Repo}

  describe "CsvImportWorker" do
    setup do
      # Create test data
      {:ok, branch} = Branches.create_branch(%{name: "Test Branch", location: "Test City"})

      admin_attrs = %{
        username: "admin",
        password: "password123",
        role: "admin",
        branch_id: branch.id
      }

      {:ok, admin} =
        %EducationCrm.Accounts.User{}
        |> EducationCrm.Accounts.User.changeset(admin_attrs)
        |> Repo.insert()

      {:ok, telecaller1} =
        Accounts.create_telecaller(
          %{username: "telecaller1", password: "password123"},
          branch.id
        )

      {:ok, telecaller2} =
        Accounts.create_telecaller(
          %{username: "telecaller2", password: "password123"},
          branch.id
        )

      %{
        branch: branch,
        admin: admin,
        telecaller1: telecaller1,
        telecaller2: telecaller2
      }
    end

    test "enqueues CSV import job successfully", %{
      branch: branch,
      admin: admin,
      telecaller1: telecaller1,
      telecaller2: telecaller2
    } do
      csv_content = """
      name,phone
      John Doe,1234567890
      Jane Smith,9876543210
      """

      # Create temp file
      temp_file = Path.join(System.tmp_dir!(), "test_import_#{:rand.uniform(10000)}.csv")
      File.write!(temp_file, csv_content)

      args = %{
        file_path: temp_file,
        telecaller_ids: [telecaller1.id, telecaller2.id],
        branch_id: branch.id,
        admin_id: admin.id,
        filename: "test_import.csv"
      }

      assert {:ok, %Oban.Job{}} = CsvImportWorker.enqueue(args)
    end

    test "performs CSV import job successfully", %{
      branch: branch,
      admin: admin,
      telecaller1: telecaller1,
      telecaller2: telecaller2
    } do
      csv_content = """
      name,phone
      John Doe,1234567890
      Jane Smith,9876543210
      """

      # Create temp file
      temp_file = Path.join(System.tmp_dir!(), "test_import_#{:rand.uniform(10000)}.csv")
      File.write!(temp_file, csv_content)

      args = %{
        file_path: temp_file,
        telecaller_ids: [telecaller1.id, telecaller2.id],
        branch_id: branch.id,
        admin_id: admin.id,
        filename: "test_import.csv"
      }

      assert :ok = perform_job(CsvImportWorker, args)

      # Verify leads were created
      leads1 = Leads.list_leads(telecaller_id: telecaller1.id)
      leads2 = Leads.list_leads(telecaller_id: telecaller2.id)

      assert length(leads1) + length(leads2) == 2
    end
  end

  describe "RecordingProcessorWorker" do
    setup do
      # Create test data
      {:ok, branch} = Branches.create_branch(%{name: "Test Branch", location: "Test City"})

      {:ok, telecaller} =
        Accounts.create_telecaller(
          %{username: "telecaller", password: "password123"},
          branch.id
        )

      {:ok, lead} =
        Leads.create_lead(
          %{
            student_name: "Test Student",
            phone_number: "1234567890",
            branch_id: branch.id
          },
          telecaller.id
        )

      {:ok, call_log} =
        Leads.log_call(
          lead.id,
          %{outcome: "connected", duration_seconds: 120},
          telecaller.id
        )

      %{
        branch: branch,
        telecaller: telecaller,
        lead: lead,
        call_log: call_log
      }
    end

    test "enqueues chunked recording processing job successfully", %{call_log: call_log} do
      args = %{
        upload_id: "test_upload_id",
        expected_chunks: 5,
        call_log_id: call_log.id
      }

      assert {:ok, %Oban.Job{}} = RecordingProcessorWorker.enqueue_chunked(args)
    end

    test "enqueues simple recording processing job successfully", %{call_log: call_log} do
      args = %{
        temp_file_path: "/tmp/test_recording.aac",
        call_log_id: call_log.id,
        filename: "recording.aac"
      }

      assert {:ok, %Oban.Job{}} = RecordingProcessorWorker.enqueue_simple(args)
    end
  end
end
