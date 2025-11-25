defmodule EducationCrm.Repo do
  use Ecto.Repo,
    otp_app: :education_crm,
    adapter: Ecto.Adapters.Postgres
end
