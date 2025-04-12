# Base URL and common variables
$BaseUrl = "http://localhost:5011/api/v1"
$InstructorEmail = "instructor@example.com"
$UserEmail = "user@example.com"
$AdminEmail = "admin@example.com"
$Password = "Password123!"

Write-Host "Testing all API endpoints..." -ForegroundColor Green

# =====================
# AUTH ENDPOINTS
# =====================
Write-Host "`n=== AUTH ENDPOINTS ===" -ForegroundColor Cyan

# Register users (instructor, regular user, admin)
Write-Host "`nRegistering Instructor..."
$instructorBody = @{
    name = "Test Instructor"
    email = $InstructorEmail
    password = $Password
    role = "instructor"
} | ConvertTo-Json
$instructorResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method Post -ContentType "application/json" -Body $instructorBody
$instructorToken = $instructorResponse.token

Write-Host "`nRegistering Regular User..."
$userBody = @{
    name = "Test User"
    email = $UserEmail
    password = $Password
    role = "user"
} | ConvertTo-Json
$userResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method Post -ContentType "application/json" -Body $userBody
$userToken = $userResponse.token

Write-Host "`nRegistering Admin..."
$adminBody = @{
    name = "Test Admin"
    email = $AdminEmail
    password = $Password
    role = "admin"
} | ConvertTo-Json
$adminResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method Post -ContentType "application/json" -Body $adminBody
$adminToken = $adminResponse.token

# Test login
Write-Host "`nTesting Login..."
$loginBody = @{
    email = $InstructorEmail
    password = $Password
} | ConvertTo-Json
Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody

# =====================
# COURSES ENDPOINTS
# =====================
Write-Host "`n=== COURSES ENDPOINTS ===" -ForegroundColor Cyan

# Headers for instructor
$instructorHeaders = @{
    "Authorization" = "Bearer $instructorToken"
    "Content-Type" = "application/json"
}

# Create a course
Write-Host "`nCreating a course..."
$courseBody = @{
    title = "Test Course"
    description = "A test course description"
    price = 99.99
    duration = "8 weeks"
} | ConvertTo-Json
$courseResponse = Invoke-RestMethod -Uri "$BaseUrl/courses" -Method Post -Headers $instructorHeaders -Body $courseBody
$courseId = $courseResponse.data._id

# Get all courses
Write-Host "`nGetting all courses..."
Invoke-RestMethod -Uri "$BaseUrl/courses" -Method Get

# Get specific course
Write-Host "`nGetting specific course..."
Invoke-RestMethod -Uri "$BaseUrl/courses/$courseId" -Method Get

# Update course
Write-Host "`nUpdating course..."
$updateCourseBody = @{
    title = "Updated Test Course"
    price = 149.99
} | ConvertTo-Json
Invoke-RestMethod -Uri "$BaseUrl/courses/$courseId" -Method Put -Headers $instructorHeaders -Body $updateCourseBody

# Regular user enrolls in course
Write-Host "`nEnrolling in course..."
$userHeaders = @{
    "Authorization" = "Bearer $userToken"
    "Content-Type" = "application/json"
}
Invoke-RestMethod -Uri "$BaseUrl/courses/$courseId/enroll" -Method Post -Headers $userHeaders

# Add course review
Write-Host "`nAdding course review..."
$reviewBody = @{
    rating = 5
    comment = "Great course!"
} | ConvertTo-Json
Invoke-RestMethod -Uri "$BaseUrl/courses/$courseId/reviews" -Method Post -Headers $userHeaders -Body $reviewBody

# Update progress
Write-Host "`nUpdating course progress..."
$progressBody = @{
    progress = 50
} | ConvertTo-Json
Invoke-RestMethod -Uri "$BaseUrl/courses/$courseId/progress" -Method Put -Headers $userHeaders -Body $progressBody

# =====================
# NOTIFICATIONS ENDPOINTS
# =====================
Write-Host "`n=== NOTIFICATIONS ENDPOINTS ===" -ForegroundColor Cyan

# Admin creates notification
Write-Host "`nCreating notification..."
$adminHeaders = @{
    "Authorization" = "Bearer $adminToken"
    "Content-Type" = "application/json"
}
$notificationBody = @{
    title = "Test Notification"
    message = "This is a test notification"
    recipients = @($userToken.id)
} | ConvertTo-Json
$notificationResponse = Invoke-RestMethod -Uri "$BaseUrl/notifications" -Method Post -Headers $adminHeaders -Body $notificationBody
$notificationId = $notificationResponse.data._id

# Get notifications
Write-Host "`nGetting notifications..."
Invoke-RestMethod -Uri "$BaseUrl/notifications" -Method Get -Headers $userHeaders

# Mark notification as read
Write-Host "`nMarking notification as read..."
Invoke-RestMethod -Uri "$BaseUrl/notifications/$notificationId/read" -Method Put -Headers $userHeaders

# Mark all notifications as read
Write-Host "`nMarking all notifications as read..."
Invoke-RestMethod -Uri "$BaseUrl/notifications/read-all" -Method Put -Headers $userHeaders

# Delete notification
Write-Host "`nDeleting notification..."
Invoke-RestMethod -Uri "$BaseUrl/notifications/$notificationId" -Method Delete -Headers $userHeaders

# =====================
# PAYMENTS ENDPOINTS
# =====================
Write-Host "`n=== PAYMENTS ENDPOINTS ===" -ForegroundColor Cyan

# Process Stripe payment
Write-Host "`nProcessing Stripe payment..."
$stripePaymentBody = @{
    courseId = $courseId
    token = "tok_visa"
    amount = 99.99
} | ConvertTo-Json
$paymentResponse = Invoke-RestMethod -Uri "$BaseUrl/payments/stripe" -Method Post -Headers $userHeaders -Body $stripePaymentBody
$paymentId = $paymentResponse.data._id

# Process PayPal payment
Write-Host "`nProcessing PayPal payment..."
$paypalPaymentBody = @{
    courseId = $courseId
    paypalOrderId = "PAY-1234567890"
    amount = 99.99
} | ConvertTo-Json
Invoke-RestMethod -Uri "$BaseUrl/payments/paypal" -Method Post -Headers $userHeaders -Body $paypalPaymentBody

# Get payment history
Write-Host "`nGetting payment history..."
Invoke-RestMethod -Uri "$BaseUrl/payments/history" -Method Get -Headers $userHeaders

# Get specific payment details
Write-Host "`nGetting payment details..."
Invoke-RestMethod -Uri "$BaseUrl/payments/$paymentId" -Method Get -Headers $userHeaders

# =====================
# CLEANUP / LOGOUT
# =====================
Write-Host "`n=== CLEANUP ===" -ForegroundColor Cyan

# Delete course
Write-Host "`nDeleting course..."
Invoke-RestMethod -Uri "$BaseUrl/courses/$courseId" -Method Delete -Headers $instructorHeaders

# Logout all users
Write-Host "`nLogging out users..."
Invoke-RestMethod -Uri "$BaseUrl/auth/logout" -Method Get -Headers $instructorHeaders
Invoke-RestMethod -Uri "$BaseUrl/auth/logout" -Method Get -Headers $userHeaders
Invoke-RestMethod -Uri "$BaseUrl/auth/logout" -Method Get -Headers $adminHeaders

Write-Host "`nAll endpoint tests completed!" -ForegroundColor Green