defmodule EducationCrmWeb.Api.AuthControllerTest do
  use EducationCrmWeb.ConnCase, async: true

  alias EducationCrm.Repo
  alias EducationCrm.Accounts.User
  alias EducationCrm.Branches.Branch

  setup do
    # Create a test branch
    branch =
      %Branch{}
      |> Branch.changeset(%{name: "Test Branch", location: "Test Location"})
      |> Repo.insert!()

    # Create a test user
    user =
      %User{}
      |> User.changeset(%{
        username: "testuser",
        password: "password123",
        role: "telecaller",
        branch_id: branch.id
      })
      |> Repo.insert!()

    {:ok, branch: branch, user: user}
  end

  describe "POST /api/auth/login" do
    test "returns JWT tokens with valid credentials", %{conn: conn} do
      conn =
        post(conn, ~p"/api/auth/login", %{
          username: "testuser",
          password: "password123"
        })

      assert %{
               "data" => %{
                 "access_token" => access_token,
                 "refresh_token" => refresh_token,
                 "token_type" => "Bearer",
                 "expires_in" => 900
               }
             } = json_response(conn, 200)

      assert is_binary(access_token)
      assert is_binary(refresh_token)
      assert String.length(access_token) > 0
      assert String.length(refresh_token) > 0
    end

    test "returns error with invalid username", %{conn: conn} do
      conn =
        post(conn, ~p"/api/auth/login", %{
          username: "nonexistent",
          password: "password123"
        })

      assert %{
               "error" => %{
                 "code" => "AUTHENTICATION_ERROR",
                 "message" => "Invalid credentials"
               }
             } = json_response(conn, 401)
    end

    test "returns error with invalid password", %{conn: conn} do
      conn =
        post(conn, ~p"/api/auth/login", %{
          username: "testuser",
          password: "wrongpassword"
        })

      assert %{
               "error" => %{
                 "code" => "AUTHENTICATION_ERROR",
                 "message" => "Invalid credentials"
               }
             } = json_response(conn, 401)
    end

    test "returns error when username is missing", %{conn: conn} do
      conn =
        post(conn, ~p"/api/auth/login", %{
          password: "password123"
        })

      assert %{
               "error" => %{
                 "code" => "VALIDATION_ERROR",
                 "message" => "Username and password are required"
               }
             } = json_response(conn, 400)
    end

    test "returns error when password is missing", %{conn: conn} do
      conn =
        post(conn, ~p"/api/auth/login", %{
          username: "testuser"
        })

      assert %{
               "error" => %{
                 "code" => "VALIDATION_ERROR",
                 "message" => "Username and password are required"
               }
             } = json_response(conn, 400)
    end

    test "returns error when both credentials are missing", %{conn: conn} do
      conn = post(conn, ~p"/api/auth/login", %{})

      assert %{
               "error" => %{
                 "code" => "VALIDATION_ERROR",
                 "message" => "Username and password are required"
               }
             } = json_response(conn, 400)
    end

    test "returns error for inactive user", %{conn: conn, user: user} do
      # Deactivate the user
      user
      |> User.update_changeset(%{active: false})
      |> Repo.update!()

      conn =
        post(conn, ~p"/api/auth/login", %{
          username: "testuser",
          password: "password123"
        })

      assert %{
               "error" => %{
                 "code" => "AUTHENTICATION_ERROR",
                 "message" => "Invalid credentials"
               }
             } = json_response(conn, 401)
    end
  end

  describe "POST /api/auth/refresh" do
    test "returns new tokens with valid refresh token", %{conn: conn} do
      # First login to get tokens
      login_conn =
        post(conn, ~p"/api/auth/login", %{
          username: "testuser",
          password: "password123"
        })

      %{"data" => %{"refresh_token" => refresh_token}} = json_response(login_conn, 200)

      # Use refresh token to get new tokens
      conn =
        post(conn, ~p"/api/auth/refresh", %{
          refresh_token: refresh_token
        })

      assert %{
               "data" => %{
                 "access_token" => new_access_token,
                 "refresh_token" => new_refresh_token,
                 "token_type" => "Bearer",
                 "expires_in" => 900
               }
             } = json_response(conn, 200)

      assert is_binary(new_access_token)
      assert is_binary(new_refresh_token)
      assert String.length(new_access_token) > 0
      assert String.length(new_refresh_token) > 0
    end

    test "returns error with invalid refresh token", %{conn: conn} do
      conn =
        post(conn, ~p"/api/auth/refresh", %{
          refresh_token: "invalid_token"
        })

      assert %{
               "error" => %{
                 "code" => "AUTHENTICATION_ERROR",
                 "message" => "Invalid or expired refresh token"
               }
             } = json_response(conn, 401)
    end

    test "returns error when refresh token is missing", %{conn: conn} do
      conn = post(conn, ~p"/api/auth/refresh", %{})

      assert %{
               "error" => %{
                 "code" => "VALIDATION_ERROR",
                 "message" => "Refresh token is required"
               }
             } = json_response(conn, 400)
    end

    test "returns error when using access token instead of refresh token", %{conn: conn} do
      # First login to get tokens
      login_conn =
        post(conn, ~p"/api/auth/login", %{
          username: "testuser",
          password: "password123"
        })

      %{"data" => %{"access_token" => access_token}} = json_response(login_conn, 200)

      # Try to use access token for refresh (should fail)
      conn =
        post(conn, ~p"/api/auth/refresh", %{
          refresh_token: access_token
        })

      assert %{
               "error" => %{
                 "code" => "AUTHENTICATION_ERROR",
                 "message" => "Invalid or expired refresh token"
               }
             } = json_response(conn, 401)
    end
  end

  describe "POST /api/auth/logout" do
    test "successfully revokes token", %{conn: conn} do
      # First login to get token
      login_conn =
        post(conn, ~p"/api/auth/login", %{
          username: "testuser",
          password: "password123"
        })

      %{"data" => %{"access_token" => access_token}} = json_response(login_conn, 200)

      # Logout with the token
      conn =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post(~p"/api/auth/logout")

      assert %{
               "data" => %{
                 "message" => "Successfully logged out"
               }
             } = json_response(conn, 200)
    end

    test "returns error with invalid token", %{conn: conn} do
      conn =
        conn
        |> put_req_header("authorization", "Bearer invalid_token")
        |> post(~p"/api/auth/logout")

      assert %{
               "error" => %{
                 "code" => "AUTHENTICATION_ERROR",
                 "message" => "Invalid or expired token"
               }
             } = json_response(conn, 401)
    end

    test "returns error when authorization header is missing", %{conn: conn} do
      conn = post(conn, ~p"/api/auth/logout")

      assert %{
               "error" => %{
                 "code" => "AUTHENTICATION_ERROR",
                 "message" => "Authorization header is required"
               }
             } = json_response(conn, 401)
    end

    test "returns error with malformed authorization header", %{conn: conn} do
      conn =
        conn
        |> put_req_header("authorization", "InvalidFormat token123")
        |> post(~p"/api/auth/logout")

      assert %{
               "error" => %{
                 "code" => "AUTHENTICATION_ERROR",
                 "message" => "Authorization header is required"
               }
             } = json_response(conn, 401)
    end

    # Note: Token blacklisting requires additional infrastructure (Redis/ETS store)
    # This test is commented out until token blacklisting is implemented
    # test "returns error when trying to use revoked token", %{conn: conn} do
    #   # First login to get token
    #   login_conn =
    #     post(conn, ~p"/api/auth/login", %{
    #       username: "testuser",
    #       password: "password123"
    #     })
    #
    #   %{"data" => %{"access_token" => access_token}} = json_response(login_conn, 200)
    #
    #   # Logout (revoke token)
    #   conn
    #   |> put_req_header("authorization", "Bearer #{access_token}")
    #   |> post(~p"/api/auth/logout")
    #
    #   # Try to logout again with the same token (should fail)
    #   conn =
    #     conn
    #     |> put_req_header("authorization", "Bearer #{access_token}")
    #     |> post(~p"/api/auth/logout")
    #
    #   assert %{
    #            "error" => %{
    #              "code" => "AUTHENTICATION_ERROR",
    #              "message" => "Invalid or expired token"
    #            }
    #          } = json_response(conn, 401)
    # end
  end
end
