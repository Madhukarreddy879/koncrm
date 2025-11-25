# Database Seeds Documentation

This document explains how to use the database seed script for the Education CRM system.

## Overview

The seed script (`priv/repo/seeds.exs`) populates the database with sample data for development and testing purposes. It creates:

- **3 Branch locations** (Hyderabad Main, Secunderabad, Kukatpally)
- **1 Admin user** for system administration
- **6 Telecaller accounts** distributed across branches
- **15 Sample leads** with various statuses and details

## Prerequisites

Before running the seed script, ensure:

1. PostgreSQL database is running (use `docker-compose up -d` to start)
2. Database has been created and migrated:
   ```bash
   mix ecto.create
   mix ecto.migrate
   ```

## Running the Seeds

To populate the database with sample data:

```bash
mix run priv/repo/seeds.exs
```

### Important Notes

- **The script clears existing data** before seeding. Comment out the `Repo.delete_all` lines if you want to preserve existing data.
- The script is idempotent when data clearing is disabled - you can run it multiple times safely.
- All passwords are hashed using Argon2 for security.

## Login Credentials

### Admin Account

- **Username:** `admin`
- **Password:** `admin123`
- **Role:** Admin (full system access)

### Telecaller Accounts

All telecallers use the password: `password123`

#### Hyderabad Main Branch
- `priya.sharma`
- `rahul.kumar`
- `anjali.reddy`

#### Secunderabad Branch
- `vikram.singh`
- `sneha.patel`

#### Kukatpally Branch
- `arun.nair`

## Sample Data Details

### Branches

1. **Hyderabad Main** - Banjara Hills, Hyderabad
2. **Secunderabad** - Secunderabad Railway Station Road
3. **Kukatpally** - KPHB Colony, Kukatpally

### Sample Leads

The seed script creates 15 leads with varying levels of detail:

- **New leads** - Only name and phone (simulating CSV import)
- **Contacted leads** - Basic details filled in
- **Interested leads** - Full details including preferred course and university
- **Not interested leads** - Marked as not interested after contact
- **Enrolled leads** - Successfully converted students

Lead statuses include:
- `new` - Freshly imported, not yet contacted
- `contacted` - Initial contact made
- `interested` - Student showed interest
- `not_interested` - Student declined
- `enrolled` - Successfully enrolled
- `lost` - Lead lost to competitor or other reasons

### Lead Distribution

Leads are distributed across telecallers to simulate real workload:
- Each telecaller has 2-3 leads assigned
- Leads are assigned to their respective branch telecallers
- Various contact statuses to test different workflows

## Customizing Seeds

To customize the seed data:

1. **Add more branches**: Add new `Repo.insert!(%Branch{...})` calls
2. **Add more telecallers**: Create additional user records with `role: "telecaller"`
3. **Add more leads**: Extend the `sample_leads` list with new lead data
4. **Change passwords**: Modify the `Argon2.hash_pwd_salt()` calls (remember to update this README)

## Resetting the Database

To completely reset and reseed the database:

```bash
mix ecto.reset
```

This will:
1. Drop the database
2. Create a new database
3. Run all migrations
4. Run the seed script

## Testing the Seeds

After running seeds, verify the data:

```bash
# Start the Phoenix server
mix phx.server

# Or use IEx to query the database
iex -S mix

# In IEx:
iex> EducationCrm.Repo.aggregate(EducationCrm.Branches.Branch, :count)
3

iex> EducationCrm.Repo.aggregate(EducationCrm.Accounts.User, :count)
7

iex> EducationCrm.Repo.aggregate(EducationCrm.Leads.Lead, :count)
15
```

## Production Warning

⚠️ **Never run this seed script in production!**

This script is designed for development and testing only. It:
- Uses weak, well-known passwords
- Clears existing data
- Creates test data that is not suitable for production use

For production, create a separate seed script or use proper data migration tools.
