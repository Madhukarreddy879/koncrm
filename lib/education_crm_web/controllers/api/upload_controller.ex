defmodule EducationCrmWeb.Api.UploadController do
  use EducationCrmWeb, :controller

  @doc """
  Handles local file uploads (PUT).
  Saves the raw body to priv/static/uploads.
  """
  def upload(conn, %{"key" => key}) do
    if Application.get_env(:education_crm, :environment) == :prod do
      send_resp(conn, 403, "Local upload not allowed in production")
    else
      # Read the entire body
      {:ok, body, conn} = read_body(conn)
      
      # Ensure directory exists
      upload_path = Path.join(:code.priv_dir(:education_crm), "static/uploads")
      File.mkdir_p!(upload_path)
      
      # Write file
      file_path = Path.join(upload_path, key)
      File.write!(file_path, body)
      
      json(conn, %{data: %{url: "/uploads/#{key}", message: "Upload successful"}})
    end
  end
end
