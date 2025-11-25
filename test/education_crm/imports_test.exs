defmodule EducationCrm.ImportsTest do
  use EducationCrm.DataCase

  alias EducationCrm.Imports
  alias EducationCrm.{Accounts, Branches}
  alias EducationCrm.Repo

  describe "parse_csv_content/1" do
    test "parses valid CSV with name and phone columns" do
      csv_content = """
      name,phone
      John Doe,1234567890
      Jane Smith,9876543210
      """

      assert {:ok, %{valid: valid, invalid: invalid}} = Imports.parse_csv_content(csv_content)
      assert length(valid) == 2
      assert length(invalid) == 0
      assert %{student_name: "John Doe", phone_number: "1234567890"} = Enum.at(valid, 0)
    end

    test "handles CSV with alternate column names" do
      csv_content = """
      student_name,phone_number
      John Doe,1234567890
      """

      assert {:ok, %{valid: valid, invalid: _}} = Imports.parse_csv_content(csv_content)
      assert length(valid) == 1
    end

    test "validates required fields" do
      csv_content = """
      name,phone
      John Doe,
      ,1234567890
      """

      assert {:ok, %{valid: valid, invalid: invalid}} = Imports.parse_csv_content(csv_content)
      assert length(valid) == 0
      assert length(invalid) == 2
    end

    test "returns error for missing name column" do
      csv_content = """
      phone
      1234567890
      """

      assert {:error, :missing_name_column} = Imports.parse_csv_content(csv_content)
    end

    test "returns error for missing phone column" do
      csv_content = """
      name
      John Doe
      """

      assert {:error, :missing_phone_column} = Imports.parse_csv_content(csv_content)
    end
  end

  describe "import_leads/5" do
    setup do
      branch = Branches.create_branch(%{name: "Test Branch", location: "Test City"})
      {:ok, branch} = branch

      # Create admin user directly via Repo
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

      telecaller1_attrs = %{
        username: "telecaller1",
        password: "password123"
      }

      telecaller2_attrs = %{
        username: "telecaller2",
        password: "password123"
      }

      {:ok, tc1} = Accounts.create_telecaller(telecaller1_attrs, branch.id)
      {:ok, tc2} = Accounts.create_telecaller(telecaller2_attrs, branch.id)

      %{branch: branch, admin: admin, telecaller1: tc1, telecaller2: tc2}
    end

    test "imports valid leads and distributes to telecallers", %{
      branch: branch,
      admin: admin,
      telecaller1: tc1,
      telecaller2: tc2
    } do
      csv_content = """
      name,phone
      John Doe,1234567890
      Jane Smith,9876543210
      Bob Johnson,5555555555
      Alice Brown,4444444444
      """

      result =
        Imports.import_leads(
          csv_content,
          [tc1.id, tc2.id],
          branch.id,
          admin.id,
          "test_leads.csv"
        )

      assert {:ok, summary} = result
      assert summary.total_rows == 4
      assert summary.successful_rows == 4
      assert summary.failed_rows == 0
      assert summary.errors == []

      # Verify distribution
      assert Map.get(summary.telecaller_distribution, tc1.id) == 2
      assert Map.get(summary.telecaller_distribution, tc2.id) == 2
    end

    test "handles mixed valid and invalid rows", %{
      branch: branch,
      admin: admin,
      telecaller1: tc1
    } do
      csv_content = """
      name,phone
      John Doe,1234567890
      ,9876543210
      Bob Johnson,
      """

      result =
        Imports.import_leads(csv_content, [tc1.id], branch.id, admin.id, "mixed_leads.csv")

      assert {:ok, summary} = result
      assert summary.total_rows == 3
      assert summary.successful_rows == 1
      assert summary.failed_rows == 2
      assert length(summary.errors) == 2
    end
  end
end
