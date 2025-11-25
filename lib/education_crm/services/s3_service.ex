defmodule EducationCrm.Services.S3Service do
  @moduledoc """
  Service for handling file uploads to S3 (or local storage in dev).
  """

  @doc """
  Generates a presigned URL for uploading a file.
  For local development, returns a local URL and ensures the directory exists.
  """
  def presigned_put_url(key, content_type) do
    if Application.get_env(:education_crm, :environment) == :prod do
      # Generate presigned URL using ExAws
      # Expires in 1 hour (3600 seconds)
      opts = [expires_in: 3600, query_params: [{"Content-Type", content_type}]]
      
      case ExAws.S3.presigned_url(ExAws.Config.new(:s3), :put, bucket(), key, opts) do
        {:ok, url} -> {:ok, url}
        {:error, reason} -> {:error, reason}
      end
    else
      # Local development: Return a URL that the client can PUT to
      # For simplicity in this demo, we'll return a direct file path or a special endpoint
      # In a real app, we might use a separate upload controller.
      # Here, we'll simulate it by returning a local URL that the mobile app
      # will treat as the "upload" target.
      
      # Ensure upload directory exists
      upload_path = Path.join(:code.priv_dir(:education_crm), "static/uploads")
      File.mkdir_p!(upload_path)
      
      # Return a URL that points to our custom upload endpoint
      # The mobile app will PUT to this URL
      url = EducationCrmWeb.Endpoint.url() <> "/api/uploads/" <> key
      {:ok, url}
    end
  end

  @doc """
  Generates a public URL for reading a file.
  """
  def public_url(key) do
    if Application.get_env(:education_crm, :environment) == :prod do
      "https://#{bucket()}.s3.amazonaws.com/#{key}"
    else
      EducationCrmWeb.Endpoint.url() <> "/uploads/" <> key
    end
  end

  defp bucket do
    System.get_env("AWS_BUCKET_NAME") || "education-crm-uploads"
  end
end
