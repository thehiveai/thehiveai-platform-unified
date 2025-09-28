# PowerShell script to enable Claude and Gemini models in tenant settings
# This updates the database directly to enable all models for testing

$orgId = "00000000-0000-0000-0000-000000000001"  # Default org ID from .env.local

Write-Host "Enabling Claude and Gemini models for org: $orgId"

# Make API call to enable models
$body = @{
    modelEnabled = @{
        openai = $true
        gemini = $true
        anthropic = $true
    }
} | ConvertTo-Json -Depth 3

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/admin/orgs/$orgId/settings" -Method PUT -Body $body -ContentType "application/json"
    Write-Host "✅ Successfully enabled all models!" -ForegroundColor Green
    Write-Host "Current settings:" -ForegroundColor Cyan
    $response.settings | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Failed to enable models: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Note: You may need to be authenticated first. Try accessing the admin settings page in the browser." -ForegroundColor Yellow
}
