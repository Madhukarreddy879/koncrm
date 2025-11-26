defmodule EducationCrmWeb.Api.HealthController do
  use EducationCrmWeb, :controller

  def index(conn, _params) do
    json(conn, %{status: "ok", database: "connected"})
  end
end
