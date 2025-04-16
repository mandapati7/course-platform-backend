const mongoose = require("mongoose");

const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Please provide a course title"],
    trim: true,
    maxlength: [100, "Title cannot be more than 100 characters"],
  },
  slug: {
    type: String,
    unique: true,
  },
  description: {
    type: String,
    required: [true, "Please provide a course description"],
  },
  shortDescription: {
    type: String,
    required: [true, "Please provide a short description"],
    maxlength: [200, "Short description cannot be more than 200 characters"],
  },
  price: {
    type: Number,
    required: [true, "Please provide a course price"],
  },
  discountPrice: {
    type: Number,
  },
  duration: {
    type: String,
    required: [true, "Please provide course duration"],
  },
  level: {
    type: String,
    required: [true, "Please provide course level"],
    enum: ["Beginner", "Intermediate", "Advanced", "All Levels"],
  },
  thumbnail: {
    type: String,
    required: [true, "Please provide a thumbnail image"],
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Please provide an instructor"],
  },
  category: {
    type: String,
    required: [true, "Please provide a category"],
  },
  tags: [String],
  highlights: [String],
  requirements: [String],
  isPublished: {
    type: Boolean,
    default: false,
  },
  isNew: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  rating: {
    type: Number,
    default: 0,
  },
  ratingCount: {
    type: Number,
    default: 0,
  },
  totalEnrollments: {
    type: Number,
    default: 0,
  },
  // Add Vimeo folder ID to store all course videos
  vimeoFolderId: {
    type: String,
    default: null,
  },
  sections: [
    {
      title: {
        type: String,
        required: true,
      },
      lessons: [
        {
          title: {
            type: String,
            required: true,
          },
          description: String,
          // Updated video fields for Vimeo integration
          videoProvider: {
            type: String,
            enum: ["vimeo", "youtube", "s3", null],
            default: null,
          },
          videoId: {
            type: String,
            default: null,
          },
          videoUrl: String,
          thumbnailUrl: String,
          duration: String,
          videoStatus: {
            type: String,
            enum: ["none", "uploading", "processing", "ready", "error"],
            default: "none",
          },
          resources: [
            {
              title: String,
              type: String,
              url: String,
              size: String,
            },
          ],
          isPreview: {
            type: Boolean,
            default: false,
          },
        },
      ],
    },
  ],
  reviews: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      text: String,
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create course slug from the title
CourseSchema.pre("save", function (next) {
  this.slug = this.title
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");

  this.updatedAt = Date.now();
  next();
});

// Calculate average rating when a review is added or updated
CourseSchema.methods.calculateAverageRating = function () {
  if (this.reviews.length === 0) {
    this.rating = 0;
    this.ratingCount = 0;
    return;
  }

  const totalRating = this.reviews.reduce(
    (sum, review) => sum + review.rating,
    0
  );
  this.rating = (totalRating / this.reviews.length).toFixed(1);
  this.ratingCount = this.reviews.length;
};

module.exports = mongoose.model("Course", CourseSchema);
