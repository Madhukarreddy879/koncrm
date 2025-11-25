# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :education_crm,
  ecto_repos: [EducationCrm.Repo],
  generators: [timestamp_type: :utc_datetime]

# Configures the endpoint
config :education_crm, EducationCrmWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [html: EducationCrmWeb.ErrorHTML, json: EducationCrmWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: EducationCrm.PubSub,
  live_view: [signing_salt: "T8zqVJXZ"]

# Configures the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. You can see the emails in your browser, at "/dev/mailbox".
#
# For production it's recommended to configure a different adapter
# at the `config/runtime.exs`.
config :education_crm, EducationCrm.Mailer, adapter: Swoosh.Adapters.Local

# Configure esbuild (the version is required)
config :esbuild,
  version: "0.25.4",
  education_crm: [
    args:
      ~w(js/app.js --bundle --target=es2022 --outdir=../priv/static/assets/js --external:/fonts/* --external:/images/* --alias:@=.),
    cd: Path.expand("../assets", __DIR__),
    env: %{"NODE_PATH" => [Path.expand("../deps", __DIR__), Mix.Project.build_path()]}
  ]

# Configure tailwind (the version is required)
config :tailwind,
  version: "4.1.7",
  education_crm: [
    args: ~w(
      --input=assets/css/app.css
      --output=priv/static/assets/css/app.css
    ),
    cd: Path.expand("..", __DIR__)
  ]

# Configures Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Configure Guardian for JWT authentication
config :education_crm, EducationCrm.Guardian,
  issuer: "education_crm",
  secret_key: "your-secret-key-here-change-in-production"

# Configure Oban for background job processing
config :education_crm, Oban,
  repo: EducationCrm.Repo,
  plugins: [Oban.Plugins.Pruner],
  queues: [default: 10, csv_import: 5, recordings: 3]

# Configure ETS cache
config :education_crm, :cache,
  adapter: :ets,
  ttl: 3600

# Configure file storage for call recordings
config :education_crm,
  recordings_path: "priv/static/recordings",
  # 1MB chunks
  chunk_size: 1_048_576

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
