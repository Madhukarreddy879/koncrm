defmodule EducationCrm.Services.S3Service do
  @moduledoc """
  Service for handling file uploads to S3 (or local storage in dev).
  """

  @doc """
  Generates a presigned URL for uploading a file.
  Uses local upload endpoint instead of S3.
  """
  def presigned_put_url(key, _content_type) do
    # Ensure upload directory exists
    upload_path = Path.join(:code.priv_dir(:education_crm), "static/uploads")
    File.mkdir_p!(upload_path)

    # Return a URL that points to our custom upload endpoint
    # The mobile app will PUT to this URL
    url = EducationCrmWeb.Endpoint.url() <> "/api/uploads/" <> key
    {:ok, url}
  end

  @doc """
  Generates a presigned URL for reading a file.
  """
  def presigned_get_url(key) do
    # Return URL to serve endpoint
    {:ok, EducationCrmWeb.Endpoint.url() <> "/uploads/" <> key}
  end

  @doc """
  Returns the public URL for a file.
  """
  def get_public_url(key) do
    # Return local URL
    EducationCrmWeb.Endpoint.url() <> "/uploads/" <> key
  end

  @doc """
  Returns the S3 key format.
  """
  def format_key(key), do: "s3:#{key}"

  defp bucket do
    System.get_env("AWS_BUCKET_NAME") || "education-crm-uploads"
  end
end
