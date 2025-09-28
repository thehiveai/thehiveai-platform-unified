# Test thread persistence system
$baseUrl = "http://localhost:3000"

Write-Host "🧵 Testing Thread Persistence System..." -ForegroundColor Cyan

# Test 1: Create a new thread
Write-Host "`n1️⃣ Creating new thread..." -ForegroundColor Yellow
try {
    $createBody = @{
        title = "Test Thread - $(Get-Date -Format 'HH:mm:ss')"
    } | ConvertTo-Json

    $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/threads" -Method POST -Body $createBody -ContentType "application/json"
    
    if ($createResponse.success) {
        $threadId = $createResponse.thread.id
        Write-Host "✅ Thread created: $threadId" -ForegroundColor Green
        Write-Host "   Title: $($createResponse.thread.title)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Failed to create thread: $($createResponse.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error creating thread: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Get the thread
Write-Host "`n2️⃣ Getting thread..." -ForegroundColor Yellow
try {
    $getResponse = Invoke-RestMethod -Uri "$baseUrl/api/threads/$threadId" -Method GET
    
    if ($getResponse.success) {
        Write-Host "✅ Thread retrieved successfully" -ForegroundColor Green
        Write-Host "   Messages: $($getResponse.messageCount)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Failed to get thread: $($getResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error getting thread: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: List all threads
Write-Host "`n3️⃣ Listing threads..." -ForegroundColor Yellow
try {
    $listResponse = Invoke-RestMethod -Uri "$baseUrl/api/threads" -Method GET
    
    if ($listResponse.success) {
        Write-Host "✅ Found $($listResponse.count) threads" -ForegroundColor Green
        $listResponse.threads | ForEach-Object {
            Write-Host "   - $($_.title) ($($_.id))" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Failed to list threads: $($listResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error listing threads: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Update thread title
Write-Host "`n4️⃣ Updating thread title..." -ForegroundColor Yellow
try {
    $updateBody = @{
        title = "Updated Test Thread - $(Get-Date -Format 'HH:mm:ss')"
    } | ConvertTo-Json

    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/threads/$threadId" -Method PATCH -Body $updateBody -ContentType "application/json"
    
    if ($updateResponse.success) {
        Write-Host "✅ Thread title updated" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to update thread: $($updateResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error updating thread: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Thread persistence system test complete!" -ForegroundColor Cyan
Write-Host "Next: Start your dev server with 'npm run dev' and run this test" -ForegroundColor Yellow
