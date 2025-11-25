defmodule EducationCrmWeb.PageController do
  use EducationCrmWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
