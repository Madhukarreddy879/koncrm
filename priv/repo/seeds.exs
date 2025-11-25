# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Inside the script, you can read and write to any of your
# repositories directly:
#
#     EducationCrm.Repo.insert!(%EducationCrm.SomeSchema{})
#
# We recommend using the bang functions (`insert!`, `update!`
# and so on) as they will fail if something goes wrong.

alias EducationCrm.Repo
alias EducationCrm.Accounts.User
alias EducationCrm.Branches.Branch
alias EducationCrm.Leads.Lead

import Ecto.Query

# Clear existing data (optional - comment out if you want to preserve data)
IO.puts("Clearing existing data...")
Repo.delete_all(Lead)
Repo.delete_all(User)
Repo.delete_all(Branch)

IO.puts("Seeding branches...")

# Create branches
hyderabad_branch =
  Repo.insert!(%Branch{
    name: "Hyderabad Main",
    location: "Banjara Hills, Hyderabad",
    active: true
  })

secunderabad_branch =
  Repo.insert!(%Branch{
    name: "Secunderabad",
    location: "Secunderabad Railway Station Road",
    active: true
  })

kukatpally_branch =
  Repo.insert!(%Branch{
    name: "Kukatpally",
    location: "KPHB Colony, Kukatpally",
    active: true
  })

IO.puts("✓ Created #{Repo.aggregate(Branch, :count)} branches")

IO.puts("Seeding admin user...")

# Create admin user
_admin =
  Repo.insert!(%User{
    username: "admin",
    password_hash: Argon2.hash_pwd_salt("admin123"),
    role: "admin",
    active: true
  })

IO.puts("✓ Created admin user (username: admin, password: admin123)")

IO.puts("Seeding telecaller accounts...")

# Create telecallers for Hyderabad Main branch
telecaller1 =
  Repo.insert!(%User{
    username: "priya.sharma",
    password_hash: Argon2.hash_pwd_salt("password123"),
    role: "telecaller",
    branch_id: hyderabad_branch.id,
    active: true
  })

telecaller2 =
  Repo.insert!(%User{
    username: "rahul.kumar",
    password_hash: Argon2.hash_pwd_salt("password123"),
    role: "telecaller",
    branch_id: hyderabad_branch.id,
    active: true
  })

telecaller3 =
  Repo.insert!(%User{
    username: "anjali.reddy",
    password_hash: Argon2.hash_pwd_salt("password123"),
    role: "telecaller",
    branch_id: hyderabad_branch.id,
    active: true
  })

# Create telecallers for Secunderabad branch
telecaller4 =
  Repo.insert!(%User{
    username: "vikram.singh",
    password_hash: Argon2.hash_pwd_salt("password123"),
    role: "telecaller",
    branch_id: secunderabad_branch.id,
    active: true
  })

telecaller5 =
  Repo.insert!(%User{
    username: "sneha.patel",
    password_hash: Argon2.hash_pwd_salt("password123"),
    role: "telecaller",
    branch_id: secunderabad_branch.id,
    active: true
  })

# Create telecallers for Kukatpally branch
telecaller6 =
  Repo.insert!(%User{
    username: "arun.nair",
    password_hash: Argon2.hash_pwd_salt("password123"),
    role: "telecaller",
    branch_id: kukatpally_branch.id,
    active: true
  })

IO.puts("✓ Created #{Repo.aggregate(from(u in User, where: u.role == "telecaller"), :count)} telecaller accounts")
IO.puts("  (All telecallers have password: password123)")

IO.puts("Seeding sample leads...")

# Helper to get current time without microseconds
now = DateTime.utc_now() |> DateTime.truncate(:second)

# Sample lead data
sample_leads = [
  # Leads for Hyderabad Main branch
  %{
    student_name: "Aarav Mehta",
    phone_number: "+91 9876543210",
    email: "aarav.mehta@email.com",
    city: "Hyderabad",
    preferred_course: "B.Tech Computer Science",
    preferred_university: "JNTU Hyderabad",
    status: "new",
    telecaller_id: telecaller1.id,
    branch_id: hyderabad_branch.id,
    assigned_at: now
  },
  %{
    student_name: "Diya Sharma",
    phone_number: "+91 9876543211",
    email: "diya.sharma@email.com",
    city: "Hyderabad",
    preferred_course: "MBA",
    preferred_university: "Osmania University",
    status: "contacted",
    telecaller_id: telecaller1.id,
    branch_id: hyderabad_branch.id,
    assigned_at: now,
    last_contacted_at: now,
    call_count: 1
  },
  %{
    student_name: "Rohan Patel",
    phone_number: "+91 9876543212",
    email: "rohan.patel@email.com",
    city: "Hyderabad",
    preferred_course: "B.Com",
    preferred_university: "Nizam College",
    status: "interested",
    telecaller_id: telecaller2.id,
    branch_id: hyderabad_branch.id,
    assigned_at: now,
    last_contacted_at: now,
    call_count: 2
  },
  %{
    student_name: "Ananya Reddy",
    phone_number: "+91 9876543213",
    city: "Hyderabad",
    status: "new",
    telecaller_id: telecaller2.id,
    branch_id: hyderabad_branch.id,
    assigned_at: now
  },
  %{
    student_name: "Arjun Kumar",
    phone_number: "+91 9876543214",
    email: "arjun.kumar@email.com",
    city: "Hyderabad",
    preferred_course: "BBA",
    status: "not_interested",
    telecaller_id: telecaller3.id,
    branch_id: hyderabad_branch.id,
    assigned_at: now,
    last_contacted_at: now,
    call_count: 1
  },
  %{
    student_name: "Ishita Singh",
    phone_number: "+91 9876543215",
    email: "ishita.singh@email.com",
    city: "Hyderabad",
    preferred_course: "B.Tech Electronics",
    preferred_university: "CBIT",
    status: "enrolled",
    telecaller_id: telecaller3.id,
    branch_id: hyderabad_branch.id,
    assigned_at: now,
    last_contacted_at: now,
    call_count: 3
  },
  # Leads for Secunderabad branch
  %{
    student_name: "Vivaan Gupta",
    phone_number: "+91 9876543216",
    city: "Secunderabad",
    status: "new",
    telecaller_id: telecaller4.id,
    branch_id: secunderabad_branch.id,
    assigned_at: now
  },
  %{
    student_name: "Aisha Khan",
    phone_number: "+91 9876543217",
    email: "aisha.khan@email.com",
    city: "Secunderabad",
    preferred_course: "B.Sc Nursing",
    status: "contacted",
    telecaller_id: telecaller4.id,
    branch_id: secunderabad_branch.id,
    assigned_at: now,
    last_contacted_at: now,
    call_count: 1
  },
  %{
    student_name: "Kabir Joshi",
    phone_number: "+91 9876543218",
    email: "kabir.joshi@email.com",
    city: "Secunderabad",
    preferred_course: "B.Tech Mechanical",
    preferred_university: "CBIT",
    status: "interested",
    telecaller_id: telecaller5.id,
    branch_id: secunderabad_branch.id,
    assigned_at: now,
    last_contacted_at: now,
    call_count: 2
  },
  %{
    student_name: "Saanvi Iyer",
    phone_number: "+91 9876543219",
    city: "Secunderabad",
    status: "new",
    telecaller_id: telecaller5.id,
    branch_id: secunderabad_branch.id,
    assigned_at: now
  },
  # Leads for Kukatpally branch
  %{
    student_name: "Advait Desai",
    phone_number: "+91 9876543220",
    email: "advait.desai@email.com",
    city: "Kukatpally",
    preferred_course: "B.Tech Civil",
    status: "contacted",
    telecaller_id: telecaller6.id,
    branch_id: kukatpally_branch.id,
    assigned_at: now,
    last_contacted_at: now,
    call_count: 1
  },
  %{
    student_name: "Myra Nair",
    phone_number: "+91 9876543221",
    city: "Kukatpally",
    status: "new",
    telecaller_id: telecaller6.id,
    branch_id: kukatpally_branch.id,
    assigned_at: now
  },
  # Additional leads without full details (simulating CSV import)
  %{
    student_name: "Reyansh Verma",
    phone_number: "+91 9876543222",
    status: "new",
    telecaller_id: telecaller1.id,
    branch_id: hyderabad_branch.id,
    assigned_at: now
  },
  %{
    student_name: "Kiara Malhotra",
    phone_number: "+91 9876543223",
    status: "new",
    telecaller_id: telecaller2.id,
    branch_id: hyderabad_branch.id,
    assigned_at: now
  },
  %{
    student_name: "Vihaan Chopra",
    phone_number: "+91 9876543224",
    status: "new",
    telecaller_id: telecaller3.id,
    branch_id: hyderabad_branch.id,
    assigned_at: now
  }
]

# Insert all leads
Enum.each(sample_leads, fn lead_attrs ->
  Repo.insert!(%Lead{
    student_name: lead_attrs.student_name,
    phone_number: lead_attrs.phone_number,
    email: Map.get(lead_attrs, :email),
    city: Map.get(lead_attrs, :city),
    preferred_course: Map.get(lead_attrs, :preferred_course),
    preferred_university: Map.get(lead_attrs, :preferred_university),
    alternate_phone: Map.get(lead_attrs, :alternate_phone),
    status: lead_attrs.status,
    telecaller_id: lead_attrs.telecaller_id,
    branch_id: lead_attrs.branch_id,
    assigned_at: lead_attrs.assigned_at,
    last_contacted_at: Map.get(lead_attrs, :last_contacted_at),
    call_count: Map.get(lead_attrs, :call_count, 0)
  })
end)

IO.puts("✓ Created #{Repo.aggregate(Lead, :count)} sample leads")

IO.puts("\n" <> String.duplicate("=", 60))
IO.puts("Database seeding completed successfully!")
IO.puts(String.duplicate("=", 60))
IO.puts("\nSummary:")
IO.puts("  • Branches: #{Repo.aggregate(Branch, :count)}")
IO.puts("  • Admin users: 1")
IO.puts("  • Telecallers: #{Repo.aggregate(from(u in User, where: u.role == "telecaller"), :count)}")
IO.puts("  • Sample leads: #{Repo.aggregate(Lead, :count)}")
IO.puts("\nLogin credentials:")
IO.puts("  Admin:")
IO.puts("    Username: admin")
IO.puts("    Password: admin123")
IO.puts("\n  Telecallers (all have password: password123):")
IO.puts("    • priya.sharma (Hyderabad Main)")
IO.puts("    • rahul.kumar (Hyderabad Main)")
IO.puts("    • anjali.reddy (Hyderabad Main)")
IO.puts("    • vikram.singh (Secunderabad)")
IO.puts("    • sneha.patel (Secunderabad)")
IO.puts("    • arun.nair (Kukatpally)")
IO.puts(String.duplicate("=", 60) <> "\n")
