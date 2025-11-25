defmodule EducationCrmWeb.Api.ApiIntegrationTest do
  use EducationCrmWeb.ConnCase, async: true

  alias EducationCrm.Repo
  alias EducationCrm.Accounts.User
  alias EducationCrm.Branches.Branch
  alias EducationCrm.Leads.Lead

  setup do
    # Create a test branch
    branch =
      %Branch{}
      |> Branch.changeset(%{name: "Test Branch", location: "Test Location"})
      |> Repo.insert!()

    # Create a test telecaller
    telecaller =
      %User{}
      |> User.changeset(%{
        username: "telecaller1",
        password: "password123",
        role: "telecaller",
        branch_id: branch.id
      })
      |> Repo.insert!()

    # Create a test lead
    lead =
      %Lead{}
      |> Lead.changeset(%{
        student_name: "John Doe",
        phone_number: "1234567890",
        email: "john@example.com",
        status: "new",
        telecaller_id: telecaller.id,
        branch_id: branch.id,
        assigned_at: DateTime.utc_now()
      })
      |> Repo.insert!()

    {:ok, branch: branch, telecaller: telecaller, lead: lead}
  end

  describe "API Integration Flow" do
    test "complete telecaller workflow", %{conn: conn, lead: lead} do
      # Step 1: Login
      conn =
        post(conn, ~p"/api/auth/login", %{
          username: "telecaller1",
          password: "password123"
        })

      assert %{"data" => %{"access_token" => token}} = json_response(conn, 200)

      # Step 2: Get user profile
      conn =
        build_conn()
        |> put_req_header("authorization", "Bearer #{token}")
        |> get(~p"/api/me")

      assert %{
               "data" => %{
                 "username" => "telecaller1",
                 "role" => "telecaller"
               }
             } = json_response(conn, 200)

      # Step 3: List leads
      conn =
        build_conn()
        |> put_req_header("authorization", "Bearer #{token}")
        |> get(~p"/api/leads")

      assert %{"data" => leads, "meta" => %{"total" => 1}} = json_response(conn, 200)
      assert length(leads) == 1

      # Step 4: Get lead details
      conn =
        build_conn()
        |> put_req_header("authorization", "Bearer #{token}")
        |> get(~p"/api/leads/#{lead.id}")

      assert %{
               "data" => %{
                 "student_name" => "John Doe",
                 "phone_number" => "1234567890"
               }
             } = json_response(conn, 200)

      # Step 5: Update lead
      conn =
        build_conn()
        |> put_req_header("authorization", "Bearer #{token}")
        |> patch(~p"/api/leads/#{lead.id}", %{
          "email" => "newemail@example.com",
          "status" => "contacted"
        })

      assert %{
               "data" => %{
                 "email" => "newemail@example.com",
                 "status" => "contacted"
               }
             } = json_response(conn, 200)

      # Step 6: Log a call
      conn =
        build_conn()
        |> put_req_header("authorization", "Bearer #{token}")
        |> post(~p"/api/leads/#{lead.id}/calls", %{
          "outcome" => "connected",
          "duration_seconds" => 120
        })

      assert %{
               "data" => %{
                 "outcome" => "connected",
                 "duration_seconds" => 120
               }
             } = json_response(conn, 201)

      # Step 7: Create a follow-up
      scheduled_at = DateTime.utc_now() |> DateTime.add(1, :day) |> DateTime.to_iso8601()

      conn =
        build_conn()
        |> put_req_header("authorization", "Bearer #{token}")
        |> post(~p"/api/followups", %{
          "lead_id" => lead.id,
          "scheduled_at" => scheduled_at,
          "description" => "Follow up on course interest"
        })

      assert %{
               "data" => %{
                 "description" => "Follow up on course interest",
                 "completed" => false
               }
             } = json_response(conn, 201)

      followup_id = json_response(conn, 201)["data"]["id"]

      # Step 8: List follow-ups
      conn =
        build_conn()
        |> put_req_header("authorization", "Bearer #{token}")
        |> get(~p"/api/followups")

      assert %{"data" => followups} = json_response(conn, 200)
      assert length(followups) == 1

      # Step 9: Complete follow-up
      conn =
        build_conn()
        |> put_req_header("authorization", "Bearer #{token}")
        |> patch(~p"/api/followups/#{followup_id}")

      assert %{
               "data" => %{
                 "completed" => true
               }
             } = json_response(conn, 200)

      # Step 10: Get stats
      conn =
        build_conn()
        |> put_req_header("authorization", "Bearer #{token}")
        |> get(~p"/api/me/stats")

      assert %{
               "data" => %{
                 "total_calls" => 1,
                 "connected_calls" => 1,
                 "total_leads" => 1
               }
             } = json_response(conn, 200)

      # Step 11: Logout
      conn =
        build_conn()
        |> put_req_header("authorization", "Bearer #{token}")
        |> post(~p"/api/auth/logout")

      assert %{"data" => %{"message" => "Successfully logged out"}} = json_response(conn, 200)
    end

    test "unauthorized access is blocked", %{conn: conn, lead: lead} do
      # Try to access leads without token
      conn = get(conn, ~p"/api/leads")

      assert %{
               "error" => %{
                 "code" => "AUTHENTICATION_ERROR",
                 "message" => "Authorization header is required"
               }
             } = json_response(conn, 401)

      # Try to access specific lead without token
      conn = build_conn() |> get(~p"/api/leads/#{lead.id}")

      assert %{
               "error" => %{
                 "code" => "AUTHENTICATION_ERROR"
               }
             } = json_response(conn, 401)
    end

    test "telecaller cannot access other telecaller's leads", %{
      conn: conn,
      branch: branch,
      lead: lead
    } do
      # Create another telecaller
      other_telecaller =
        %User{}
        |> User.changeset(%{
          username: "telecaller2",
          password: "password123",
          role: "telecaller",
          branch_id: branch.id
        })
        |> Repo.insert!()

      # Login as second telecaller
      conn =
        post(conn, ~p"/api/auth/login", %{
          username: "telecaller2",
          password: "password123"
        })

      assert %{"data" => %{"access_token" => token}} = json_response(conn, 200)

      # Try to access first telecaller's lead
      conn =
        build_conn()
        |> put_req_header("authorization", "Bearer #{token}")
        |> get(~p"/api/leads/#{lead.id}")

      assert %{
               "error" => %{
                 "code" => "AUTHORIZATION_ERROR",
                 "message" => "You are not authorized to access this lead"
               }
             } = json_response(conn, 403)

      # Try to update first telecaller's lead
      conn =
        build_conn()
        |> put_req_header("authorization", "Bearer #{token}")
        |> patch(~p"/api/leads/#{lead.id}", %{"status" => "contacted"})

      assert %{
               "error" => %{
                 "code" => "AUTHORIZATION_ERROR"
               }
             } = json_response(conn, 403)
    end
  end
end
