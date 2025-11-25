defmodule EducationCrm.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      EducationCrmWeb.Telemetry,
      EducationCrm.Repo,
      {DNSCluster, query: Application.get_env(:education_crm, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: EducationCrm.PubSub},
      # Start Oban for background job processing
      {Oban, Application.fetch_env!(:education_crm, Oban)},
      # Start ETS cache
      EducationCrm.Cache,
      # Start a worker by calling: EducationCrm.Worker.start_link(arg)
      # {EducationCrm.Worker, arg},
      # Start to serve requests, typically the last entry
      EducationCrmWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: EducationCrm.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    EducationCrmWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
