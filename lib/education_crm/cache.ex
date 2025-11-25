defmodule EducationCrm.Cache do
  @moduledoc """
  ETS-based cache for frequently accessed data.
  """
  use GenServer

  @table_name :education_crm_cache
  @default_ttl 3600

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  @impl true
  def init(_) do
    :ets.new(@table_name, [:set, :public, :named_table, read_concurrency: true])
    {:ok, %{}}
  end

  @doc """
  Get a value from cache.
  """
  def get(key) do
    case :ets.lookup(@table_name, key) do
      [{^key, value, expires_at}] ->
        if System.system_time(:second) < expires_at do
          {:ok, value}
        else
          :ets.delete(@table_name, key)
          {:error, :not_found}
        end

      [] ->
        {:error, :not_found}
    end
  end

  @doc """
  Put a value in cache with optional TTL.
  """
  def put(key, value, ttl \\ @default_ttl) do
    expires_at = System.system_time(:second) + ttl
    :ets.insert(@table_name, {key, value, expires_at})
    :ok
  end

  @doc """
  Delete a value from cache.
  """
  def delete(key) do
    :ets.delete(@table_name, key)
    :ok
  end

  @doc """
  Clear all cache entries.
  """
  def clear do
    :ets.delete_all_objects(@table_name)
    :ok
  end
end
