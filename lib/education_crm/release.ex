defmodule EducationCrm.Release do
  @moduledoc """
  Used for executing DB release tasks when run in production without Mix
  installed.
  """
  @app :education_crm

  def migrate do
    load_app()

    for repo <- repos() do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end
  end

  def seed do
    load_app()

    for repo <- repos() do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, fn _repo ->
        priv_dir = Application.app_dir(@app, "priv")
        seed_file = Path.join([priv_dir, "repo", "seeds.exs"])

        if File.exists?(seed_file) do
          IO.puts "Running seed file: #{seed_file}"
          Code.eval_file(seed_file)
        else
          IO.puts "No seeds.exs file found at #{seed_file}"
        end
      end)
    end
  end

  def rollback(repo, version) do
    load_app()
    {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :down, to: version))
  end

  defp repos do
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp load_app do
    Application.load(@app)
  end
end
