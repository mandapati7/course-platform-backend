#!/bin/bash

# Base URL and common variables
BASE_URL="http://localhost:5011/api/v1"
INSTRUCTOR_EMAIL="instructor@example.com"
STUDENT_EMAIL="student@example.com"
ADMIN_EMAIL="admin@example.com"
PASSWORD="Password123!"

echo "Testing all API endpoints..."

# =====================
# AUTH ENDPOINTS
# =====================
echo -e "\n=== AUTH ENDPOINTS ==="

# Register instructor
echo -e "\nRegistering Instructor..."
INSTRUCTOR_TOKEN=$(curl -s -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Instructor\",
    \"email\": \"${INSTRUCTOR_EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"role\": \"instructor\"
  }" | jq -r '.token')

echo "Instructor Token: ${INSTRUCTOR_TOKEN}"

# Register student
echo -e "\nRegistering Student..."
STUDENT_TOKEN=$(curl -s -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Student\",
    \"email\": \"${STUDENT_EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"role\": \"student\"
  }" | jq -r '.token')

echo "Student Token: ${STUDENT_TOKEN}"

# Register admin
echo -e "\nRegistering Admin..."
ADMIN_TOKEN=$(curl -s -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Admin\",
    \"email\": \"${ADMIN_EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"role\": \"admin\"
  }" | jq -r '.token')

echo "Admin Token: ${ADMIN_TOKEN}"

# Test login
echo -e "\nTesting Login..."
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${INSTRUCTOR_EMAIL}\",
    \"password\": \"${PASSWORD}\"
  }"

# =====================
# COURSES ENDPOINTS
# =====================
echo -e "\n=== COURSES ENDPOINTS ==="

# Create a course
echo -e "\nCreating a course..."
COURSE_ID=$(curl -s -X POST "${BASE_URL}/courses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${INSTRUCTOR_TOKEN}" \
  -d '{
    "title": "Test Course",
    "description": "A test course description",
    "price": 99.99,
    "duration": "8 weeks"
  }' | jq -r '.data._id')

echo "Course ID: ${COURSE_ID}"

# Get all courses
echo -e "\nGetting all courses..."
curl -X GET "${BASE_URL}/courses"

# Get specific course
echo -e "\nGetting specific course..."
curl -X GET "${BASE_URL}/courses/${COURSE_ID}"

# Update course
echo -e "\nUpdating course..."
curl -X PUT "${BASE_URL}/courses/${COURSE_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${INSTRUCTOR_TOKEN}" \
  -d '{
    "title": "Updated Test Course",
    "price": 149.99
  }'

# Student enrolls in course
echo -e "\nEnrolling in course..."
curl -X POST "${BASE_URL}/courses/${COURSE_ID}/enroll" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}"

# Add course review
echo -e "\nAdding course review..."
curl -X POST "${BASE_URL}/courses/${COURSE_ID}/reviews" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -d '{
    "rating": 5,
    "comment": "Great course!"
  }'

# Update progress
echo -e "\nUpdating course progress..."
curl -X PUT "${BASE_URL}/courses/${COURSE_ID}/progress" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -d '{
    "progress": 50
  }'

# =====================
# NOTIFICATIONS ENDPOINTS
# =====================
echo -e "\n=== NOTIFICATIONS ENDPOINTS ==="

# Create notification
echo -e "\nCreating notification..."
NOTIFICATION_ID=$(curl -s -X POST "${BASE_URL}/notifications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d "{
    \"title\": \"Test Notification\",
    \"message\": \"This is a test notification\",
    \"recipients\": [\"${STUDENT_TOKEN}\"]
  }" | jq -r '.data._id')

echo "Notification ID: ${NOTIFICATION_ID}"

# Get notifications
echo -e "\nGetting notifications..."
curl -X GET "${BASE_URL}/notifications" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}"

# Mark notification as read
echo -e "\nMarking notification as read..."
curl -X PUT "${BASE_URL}/notifications/${NOTIFICATION_ID}/read" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}"

# Mark all notifications as read
echo -e "\nMarking all notifications as read..."
curl -X PUT "${BASE_URL}/notifications/read-all" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}"

# Delete notification
echo -e "\nDeleting notification..."
curl -X DELETE "${BASE_URL}/notifications/${NOTIFICATION_ID}" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}"

# =====================
# PAYMENTS ENDPOINTS
# =====================
echo -e "\n=== PAYMENTS ENDPOINTS ==="

# Process Stripe payment
echo -e "\nProcessing Stripe payment..."
PAYMENT_ID=$(curl -s -X POST "${BASE_URL}/payments/stripe" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -d "{
    \"courseId\": \"${COURSE_ID}\",
    \"token\": \"tok_visa\",
    \"amount\": 99.99
  }" | jq -r '.data._id')

echo "Payment ID: ${PAYMENT_ID}"

# Process PayPal payment
echo -e "\nProcessing PayPal payment..."
curl -X POST "${BASE_URL}/payments/paypal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}" \
  -d "{
    \"courseId\": \"${COURSE_ID}\",
    \"paypalOrderId\": \"PAY-1234567890\",
    \"amount\": 99.99
  }"

# Get payment history
echo -e "\nGetting payment history..."
curl -X GET "${BASE_URL}/payments/history" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}"

# Get specific payment details
echo -e "\nGetting payment details..."
curl -X GET "${BASE_URL}/payments/${PAYMENT_ID}" \
  -H "Authorization: Bearer ${STUDENT_TOKEN}"

# =====================
# CLEANUP / LOGOUT
# =====================
echo -e "\n=== CLEANUP ==="

# Delete course
echo -e "\nDeleting course..."
curl -X DELETE "${BASE_URL}/courses/${COURSE_ID}" \
  -H "Authorization: Bearer ${INSTRUCTOR_TOKEN}"

# Logout all users
echo -e "\nLogging out users..."
curl -X GET "${BASE_URL}/auth/logout" -H "Authorization: Bearer ${INSTRUCTOR_TOKEN}"
curl -X GET "${BASE_URL}/auth/logout" -H "Authorization: Bearer ${STUDENT_TOKEN}"
curl -X GET "${BASE_URL}/auth/logout" -H "Authorization: Bearer ${ADMIN_TOKEN}"

echo -e "\nAll endpoint tests completed!"