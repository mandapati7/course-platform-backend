// Vimeo service utility
const Vimeo = require("vimeo").Vimeo;
const ErrorResponse = require("./errorResponse");

// Initialize Vimeo client
const initVimeoClient = () => {
  const clientId = process.env.VIMEO_CLIENT_ID;
  const clientSecret = process.env.VIMEO_CLIENT_SECRET;
  const accessToken = process.env.VIMEO_ACCESS_TOKEN;

  if (!clientId || !clientSecret || !accessToken) {
    console.warn(
      "Vimeo credentials missing. Video uploads will not function correctly."
    );
    return null;
  }

  return new Vimeo(clientId, clientSecret, accessToken);
};

const client = initVimeoClient();

/**
 * Create upload ticket for direct upload to Vimeo
 * @param {Object} options Video options
 * @returns {Promise<Object>} Upload ticket and link
 */
exports.createUploadTicket = async (options) => {
  if (!client) {
    throw new ErrorResponse("Vimeo client not initialized", 500);
  }

  return new Promise((resolve, reject) => {
    client.request(
      {
        method: "POST",
        path: "/me/videos",
        query: {
          upload: {
            approach: "tus",
            size: options.size,
          },
          name: options.name,
          description: options.description,
          privacy: {
            view: "anybody", // Changed from 'disable' to 'anybody' for Basic accounts
            embed: "public", // Changed from 'private' to 'public' for Basic accounts
          },
          folder_uri: options.folderId ? `/folders/${options.folderId}` : null,
        },
      },
      (error, body, status_code, headers) => {
        if (error) {
          return reject(
            new ErrorResponse(`Vimeo API Error: ${error.message}`, 500)
          );
        }

        resolve({
          upload_link: body.upload.upload_link,
          video_uri: body.uri,
          video_id: body.uri.split("/").pop(),
        });
      }
    );
  });
};

/**
 * Get video details
 * @param {String} videoId Vimeo video ID
 * @returns {Promise<Object>} Video details
 */
exports.getVideoDetails = async (videoId) => {
  if (!client) {
    throw new ErrorResponse("Vimeo client not initialized", 500);
  }

  return new Promise((resolve, reject) => {
    client.request(
      {
        method: "GET",
        path: `/videos/${videoId}`,
      },
      (error, body, status_code, headers) => {
        if (error) {
          return reject(
            new ErrorResponse(`Vimeo API Error: ${error.message}`, 500)
          );
        }
        resolve(body);
      }
    );
  });
};

/**
 * Update privacy settings for a video
 * @param {String} videoId Vimeo video ID
 * @param {Boolean} isPreview If true, make video public
 * @returns {Promise<Object>} Updated video details
 */
exports.updateVideoPrivacy = async (videoId, isPreview = false) => {
  if (!client) {
    throw new ErrorResponse("Vimeo client not initialized", 500);
  }

  return new Promise((resolve, reject) => {
    client.request(
      {
        method: "PATCH",
        path: `/videos/${videoId}`,
        query: {
          privacy: {
            view: isPreview ? "anybody" : "anybody", // All set to 'anybody' for Basic accounts
            embed: "public", // Changed to 'public' for Basic accounts
          },
          embed: {
            buttons: {
              share: false,
              like: false,
              watchlater: false,
            },
            logos: {
              vimeo: false,
            },
            title: false,
          },
        },
      },
      (error, body, status_code, headers) => {
        if (error) {
          return reject(
            new ErrorResponse(`Vimeo API Error: ${error.message}`, 500)
          );
        }
        resolve(body);
      }
    );
  });
};

/**
 * Create a folder for course content
 * @param {String} courseName Name of the course
 * @param {String} courseId Course ID
 * @returns {Promise<String>} Folder ID
 */
exports.createCourseFolder = async (courseName, courseId) => {
  if (!client) {
    throw new ErrorResponse("Vimeo client not initialized", 500);
  }

  return new Promise((resolve, reject) => {
    client.request(
      {
        method: "POST",
        path: "/me/folders",
        query: {
          name: `Course: ${courseName} (${courseId})`,
        },
      },
      (error, body, status_code, headers) => {
        if (error) {
          return reject(
            new ErrorResponse(`Vimeo API Error: ${error.message}`, 500)
          );
        }
        resolve(body.uri.split("/").pop());
      }
    );
  });
};
