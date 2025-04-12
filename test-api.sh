#!/bin/bash

# Base URL
BASE_URL="http://localhost:5011/api/v1"
echo "Testing API endpoints..."

# 1. Test server connectivity
echo "\n=== Testing Server Connectivity ==="
curl -v "${BASE_URL}/auth/test"

# 2. Register a new user
echo "\n=== Registering New User ==="
TOKEN=$(curl -s -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test_user1",
    "email": "test@example.com",
    "password": "Password123!",
    "role": "instructor"
  }' | jq -r '.token')

echo "Received Token: ${TOKEN}"

# 3. Login with the new user
echo "\n=== Testing Login ==="
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'

# 4. Get current user details
echo "\n=== Getting User Details ==="
curl -X GET "${BASE_URL}/auth/me" \
  -H "Authorization: Bearer ${TOKEN}"

# 5. Update user details
echo "\n=== Updating User Details ==="
curl -X PUT "${BASE_URL}/auth/updatedetails" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "name": "Updated User",
    "email": "updated@example.com"
  }'

# 6. Update password
echo "\n=== Updating Password ==="
curl -X PUT "${BASE_URL}/auth/updatepassword" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "currentPassword": "Password123!",
    "newPassword": "NewPassword123!"
  }'

# 7. Test forgot password
echo "\n=== Testing Forgot Password ==="
curl -X POST "${BASE_URL}/auth/forgotpassword" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'

# 8. Logout
echo "\n=== Testing Logout ==="
curl -X GET "${BASE_URL}/auth/logout" \
  -H "Authorization: Bearer ${TOKEN}"