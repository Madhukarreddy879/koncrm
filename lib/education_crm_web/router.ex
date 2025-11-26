defmodule EducationCrmWeb.Router do
  use EducationCrmWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {EducationCrmWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", EducationCrmWeb do
    pipe_through :browser

    get "/", PageController, :home
  end

  # Admin routes
  scope "/admin", EducationCrmWeb.Admin do
    pipe_through :browser

    live "/login", LoginLive, :index
    post "/login", SessionController, :create
    delete "/logout", SessionController, :delete
  end

  # Admin authenticated routes
  scope "/admin", EducationCrmWeb.Admin do
    pipe_through :browser

    live_session :admin,
      on_mount: {EducationCrmWeb.Plugs.RequireAdmin, :require_admin},
      layout: {EducationCrmWeb.Layouts, :admin} do
      live "/dashboard", DashboardLive, :index
      live "/branches", BranchLive.Index, :index
      live "/branches/new", BranchLive.Index, :new
      live "/branches/:id/edit", BranchLive.Index, :edit
      live "/telecallers", TelecallerLive.Index, :index
      live "/telecallers/new", TelecallerLive.Index, :new
      live "/import", ImportLive.New, :new
      live "/reports", ReportLive.Index, :index
    end
  end

  # API routes
  scope "/api", EducationCrmWeb.Api do
    pipe_through :api

    # Authentication endpoints
    post "/auth/login", AuthController, :login
    post "/auth/refresh", AuthController, :refresh
    post "/auth/logout", AuthController, :logout

    # Health check
    get "/health", HealthController, :index

    # Lead endpoints (requires authentication)
    get "/leads", LeadController, :index
    get "/leads/:id", LeadController, :show
    patch "/leads/:id", LeadController, :update

    # Call logging endpoints (requires authentication)
    post "/leads/:lead_id/calls", CallController, :create
    post "/leads/:lead_id/recordings/presign", CallController, :presign_upload
    post "/leads/:lead_id/recordings", CallController, :upload_recording
    get "/leads/:lead_id/recordings/:recording_id", CallController, :show_recording

    # Follow-up endpoints (requires authentication)
    get "/followups", FollowupController, :index
    post "/followups", FollowupController, :create
    patch "/followups/:id", FollowupController, :update

    # User profile endpoints (requires authentication)
    get "/me", UserController, :me
    get "/me/stats", UserController, :stats

    # Local upload endpoint (dev/test only)
    if Application.compile_env(:education_crm, :environment) != :prod do
      put "/uploads/:key", UploadController, :upload
    end
  end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:education_crm, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: EducationCrmWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end
end
