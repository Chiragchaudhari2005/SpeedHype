import { v2 as cloudinary } from 'cloudinary';

const configureCloudinary = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    const error = new Error('Cloudinary is not configured. Set the CLOUDINARY_* values in server/.env.');
    error.statusCode = 503;
    throw error;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
};

export const uploadBlogImage = (file) => {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'speedhype/blogs', resource_type: 'image' },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result?.secure_url || !result.public_id) {
          reject(new Error('Cloudinary did not return an image URL.'));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(file.buffer);
  });
};

export const deleteBlogImages = async (images) => {
  const uniqueIds = [...new Set(images.map((image) => image?.publicId).filter(Boolean))];
  if (!uniqueIds.length) return;

  configureCloudinary();
  const results = await Promise.all(
    uniqueIds.map((publicId) => cloudinary.uploader.destroy(publicId, { resource_type: 'image' })),
  );
  const failures = results.filter((result) => result.result !== 'ok' && result.result !== 'not found');
  if (failures.length) {
    throw new Error('Cloudinary could not remove one or more blog images.');
  }
};

export const uploadCommunityMedia = (file, resourceType) => {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'speedhype/communities', resource_type: resourceType },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result?.secure_url || !result.public_id) {
          reject(new Error('Cloudinary did not return a media URL.'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType,
          format: result.format || '',
        });
      },
    );
    stream.end(file.buffer);
  });
};

export const deleteCommunityMedia = async (media) => {
  configureCloudinary();
  const result = await cloudinary.uploader.destroy(media.publicId, {
    resource_type: media.resourceType || 'image',
  });
  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new Error('Cloudinary could not remove the community media.');
  }
};
