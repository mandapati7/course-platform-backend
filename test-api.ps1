# Base URL
$BaseUrl = "http://localhost:5011/api/v1"
Write-Host "Testing API endpoints..."

# 1. Test server connectivity
Write-Host "`n=== Testing Server Connectivity ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$BaseUrl/auth/test" -Method Get

# 2. Register a new user
Write-Host "`n=== Registering New User ===" -ForegroundColor Cyan
$registerBody = @{
    name = "test_user1"
    email = "test@example.com"
    password = "Password123!"
    role = "instructor"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method Post -ContentType "application/json" -Body $registerBody
$token = $response.token
Write-Host "Received Token: $token"

# 3. Login with the new user
Write-Host "`n=== Testing Login ===" -ForegroundColor Cyan
$loginBody = @{
    email = "test@example.com"
    password = "Password123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody

# 4. Get current user details
Write-Host "`n=== Getting User Details ===" -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer $token"
}
Invoke-RestMethod -Uri "$BaseUrl/auth/me" -Method Get -Headers $headers

# 5. Update user details
Write-Host "`n=== Updating User Details ===" -ForegroundColor Cyan
$updateBody = @{
    name = "Updated User"
    email = "updated@example.com"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/auth/updatedetails" -Method Put -ContentType "application/json" -Headers $headers -Body $updateBody

# 6. Update password
Write-Host "`n=== Updating Password ===" -ForegroundColor Cyan
$passwordBody = @{
    currentPassword = "Password123!"
    newPassword = "NewPassword123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/auth/updatepassword" -Method Put -ContentType "application/json" -Headers $headers -Body $passwordBody

# 7. Test forgot password
Write-Host "`n=== Testing Forgot Password ===" -ForegroundColor Cyan
$forgotBody = @{
    email = "updated@example.com"  # Using the updated email
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/auth/forgotpassword" -Method Post -ContentType "application/json" -Body $forgotBody

# 8. Logout
Write-Host "`n=== Testing Logout ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$BaseUrl/auth/logout" -Method Get -Headers $headers