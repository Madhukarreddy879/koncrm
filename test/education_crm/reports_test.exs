defmodule EducationCrm.ReportsTest do
  use EducationCrm.DataCase

  alias EducationCrm.Reports
  alias EducationCrm.{Accounts, Branches, Leads}

  describe "telecaller_performance/1" do
    setup do
      {:ok, branch} = Branches.create_branch(%{name: "Test Branch", location: "Test City"})

      telecaller_attrs = %{
        username: "telecaller1",
        password: "password123"
      }

      {:ok, telecaller} = Accounts.create_telecaller(telecaller_attrs, branch.id)

      %{branch: branch, telecaller: telecaller}
    end

    test "returns performance data for telecaller with no activity", %{telecaller: telecaller} do
      result = Reports.telecaller_performance(%{telecaller_id: telecaller.id})

      assert [performance] = result
      assert performance.telecaller_id == telecaller.id
      assert performance.telecaller_name == "telecaller1"
      assert performance.calls_made == 0
      assert performance.connected_calls == 0
      assert performance.leads_assigned == 0
      assert performance.leads_contacted == 0
      assert performance.leads_enrolled == 0
      assert performance.conversion_rate == 0.0
    end

    test "returns performance data for telecaller with leads", %{
      branch: branch,
      telecaller: telecaller
    } do
      # Create leads assigned to telecaller
      {:ok, _lead1} =
        Leads.create_lead(
          %{
            student_name: "John Doe",
            phone_number: "1234567890",
            status: "contacted",
            branch_id: branch.id
          },
          telecaller.id
        )

      {:ok, _lead2} =
        Leads.create_lead(
          %{
            student_name: "Jane Smith",
            phone_number: "9876543210",
            status: "enrolled",
            branch_id: branch.id
          },
          telecaller.id
        )

      result = Reports.telecaller_performance(%{telecaller_id: telecaller.id})

      assert [performance] = result
      assert performance.telecaller_id == telecaller.id
      assert performance.leads_assigned == 2
    end

    test "filters by branch_id", %{branch: branch, telecaller: telecaller} do
      # Create another branch and telecaller
      {:ok, other_branch} =
        Branches.create_branch(%{name: "Other Branch", location: "Other City"})

      {:ok, _other_telecaller} =
        Accounts.create_telecaller(
          %{username: "telecaller2", password: "password123"},
          other_branch.id
        )

      result = Reports.telecaller_performance(%{branch_id: branch.id})

      assert length(result) == 1
      assert [performance] = result
      assert performance.telecaller_id == telecaller.id
    end
  end

  describe "export_report/1" do
    test "exports report data to CSV format" do
      report_data = [
        %{
          telecaller_id: Ecto.UUID.generate(),
          telecaller_name: "John Doe",
          branch_id: Ecto.UUID.generate(),
          calls_made: 10,
          connected_calls: 8,
          leads_assigned: 5,
          leads_contacted: 4,
          leads_enrolled: 2,
          conversion_rate: 50.0
        },
        %{
          telecaller_id: Ecto.UUID.generate(),
          telecaller_name: "Jane Smith",
          branch_id: Ecto.UUID.generate(),
          calls_made: 15,
          connected_calls: 12,
          leads_assigned: 8,
          leads_contacted: 7,
          leads_enrolled: 3,
          conversion_rate: 42.86
        }
      ]

      csv_string = Reports.export_report(report_data)

      assert is_binary(csv_string)
      assert String.contains?(csv_string, "Telecaller ID")
      assert String.contains?(csv_string, "Telecaller Name")
      assert String.contains?(csv_string, "John Doe")
      assert String.contains?(csv_string, "Jane Smith")
      assert String.contains?(csv_string, "50.0")
      assert String.contains?(csv_string, "42.86")
    end

    test "handles empty report data" do
      csv_string = Reports.export_report([])

      assert is_binary(csv_string)
      assert String.contains?(csv_string, "Telecaller ID")
    end
  end
end
