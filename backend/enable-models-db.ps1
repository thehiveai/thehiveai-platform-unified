# PowerShell script to enable Claude and Gemini models by updating the database directly
# This connects to Supabase and updates the tenant_settings table

$supabaseUrl = "https://jkdcreyvnvotqxkhccjo.supabase.co"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkY3JleXZudm90cXhraGNjam8iLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzI3MjY5NzI5LCJleHAiOjIwNDI4NDU3Mjl9.6GForjJD"
$orgId = "00000000-0000-0000-0000-000000000001"

Write-Host "Enabling Claude and Gemini models in database..." -ForegroundColor Cyan

# Prepare the data
$modelSettings = @{
    openai = $true
    gemini = $true
    anthropic = $true
} | ConvertTo-Json -Compress

$body = @{
    org_id = $orgId
    key = "modelEnabled"
    value = $modelSettings
} | ConvertTo-Json

$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
    "Prefer" = "resolution=merge-duplicates"
}

try {
    # Upsert the tenant settings
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/tenant_settings" -Method POST -Body $body -Headers $headers
    Write-Host "✅ Successfully enabled all models in database!" -ForegroundColor Green
    
    # Verify the settings
    $verifyHeaders = @{
        "apikey" = $serviceRoleKey
        "Authorization" = "Bearer $serviceRoleKey"
    }
    
    $settings = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/tenant_settings?org_id=eq.$orgId&select=*" -Method GET -Headers $verifyHeaders
    Write-Host "Current tenant settings:" -ForegroundColor Yellow
    $settings | ConvertTo-Json -Depth 3
    
} catch {
    Write-Host "❌ Failed to update database: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}

Write-Host "`nNow restart the dev server to see the changes!" -ForegroundColor Green
