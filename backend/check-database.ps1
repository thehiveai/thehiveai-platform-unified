# Save as: check-database.ps1
$supabaseUrl = "https://jkdcreyvnvotqxkhccjo.supabase.co"
$serviceRole = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprZGNyZXl2bnZvdHF4a2hjY2pvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM5NDQwMiwiZXhwIjoyMDczOTcwNDAyfQ.TtlAd61VmizX_iFeZ2feN5ZGCaHeoSdg2oRzB8hCT7Y"

$headers = @{
    "apikey" = $serviceRole
    "Authorization" = "Bearer $serviceRole"
    "Content-Type" = "application/json"
}

Write-Host "🔍 Checking existing tables in app schema..." -ForegroundColor Cyan

# Check for orgs
Write-Host "`n🏢 Checking orgs table..." -ForegroundColor Cyan
try {
    $orgs = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/orgs?select=id,name&limit=5" -Headers $headers
    if ($orgs.Count -gt 0) {
        Write-Host "Found orgs:" -ForegroundColor Green
        $orgs | ForEach-Object { Write-Host "  ID: $($_.id) | Name: $($_.name)" }
        Write-Host "`n✅ Use this as DEFAULT_ORG_ID: $($orgs[0].id)" -ForegroundColor Green
    } else {
        Write-Host "❌ No orgs found - we'll create one" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Orgs table doesn't exist or not accessible - we'll create it" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Check for users
Write-Host "`n👤 Checking users table..." -ForegroundColor Cyan
try {
    $users = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/users?select=id,email&limit=5" -Headers $headers
    if ($users.Count -gt 0) {
        Write-Host "Found users:" -ForegroundColor Green
        $users | ForEach-Object { Write-Host "  ID: $($_.id) | Email: $($_.email)" }
        Write-Host "`n✅ Use this as IMPORT_CREATED_BY: $($users[0].id)" -ForegroundColor Green
    } else {
        Write-Host "❌ No users found - we'll create one" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Users table doesn't exist or not accessible - we'll create it" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Check for threads
Write-Host "`n🧵 Checking threads table..." -ForegroundColor Cyan
try {
    $threads = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/threads?select=id,title&limit=3" -Headers $headers
    Write-Host "✅ Threads table exists with $($threads.Count) threads" -ForegroundColor Green
    if ($threads.Count -gt 0) {
        $threads | ForEach-Object { Write-Host "  ID: $($_.id) | Title: $($_.title)" }
    }
} catch {
    Write-Host "❌ Threads table doesn't exist - we'll create it" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Check for messages
Write-Host "`n💬 Checking messages table..." -ForegroundColor Cyan
try {
    $messages = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/messages?select=id,role,content&limit=3" -Headers $headers
    Write-Host "✅ Messages table exists with $($messages.Count) messages" -ForegroundColor Green
} catch {
    Write-Host "❌ Messages table doesn't exist - we'll create it" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n🎯 Next: I'll show you the exact SQL to create missing tables" -ForegroundColor Cyan
