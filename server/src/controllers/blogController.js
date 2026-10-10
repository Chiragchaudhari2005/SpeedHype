import mongoose from 'mongoose';
import { getAuth } from '@clerk/express';
import Blog from '../models/Blog.js';
import { deleteBlogImages, uploadBlogImage } from '../config/cloudinary.js';

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parseTags = (value) => {
  if (value === undefined) return undefined;
  let tags;
  try {
    tags = Array.isArray(value) ? value : JSON.parse(value);
  } catch {
    throw createError('Tags must be provided as a valid list.');
  }
  if (!Array.isArray(tags)) throw createError('Tags must be provided as a list.');
  const normalized = [...new Set(tags.map((tag) => String(tag).trim().replace(/^#+/, '').trim()).filter(Boolean))];
  if (
    normalized.length > 10
    || normalized.some((tag) => tag.length > 500)
    || normalized.join(', ').length > 500
  ) {
    throw createError('Use no more than ten tags and keep the complete tags field within 500 characters.');
  }
  return normalized;
};

const parseKeptImages = (value) => {
  if (value === undefined) return undefined;
  try {
    const images = JSON.parse(value);
    if (!Array.isArray(images) || images.some((url) => typeof url !== 'string')) {
      throw new Error('invalid image list');
    }
    return images;
  } catch {
    throw createError('The remaining gallery images could not be read.');
  }
};

const parseGalleryOrder = (value) => {
  if (value === undefined) return undefined;
  try {
    const order = JSON.parse(value);
    if (!Array.isArray(order) || order.length > 5 || order.some((item) => (
      !item
      || (item.type === 'existing' && typeof item.url !== 'string')
      || (item.type === 'upload' && !Number.isInteger(item.index))
      || !['existing', 'upload'].includes(item.type)
    ))) {
      throw new Error('invalid gallery order');
    }
    return order;
  } catch {
    throw createError('The gallery image order could not be read.');
  }
};

const getUploadedFiles = (req, field) => req.files?.[field] || [];
const getAuthUserId = (req) => getAuth(req).userId;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const uploadFiles = async (files, uploadedImages) => {
  for (const file of files) {
    uploadedImages.push(await uploadBlogImage(file));
  }
  return uploadedImages;
};

const removeImagesAfterSave = async (images) => {
  try {
    await deleteBlogImages(images);
  } catch (error) {
    console.error('Failed to clean up blog images in Cloudinary:', error.message);
  }
};

export const listBlogs = async (req, res, next) => {
  try {
    const { search = '', category = '', sort = 'latest' } = req.query;
    if (String(search).length > 100) throw createError('Search must be 100 characters or fewer.');

    const filter = {};
    if (category && category !== 'all') filter.category = String(category).slice(0, 48);
    if (search) {
      const expression = new RegExp(escapeRegex(String(search)), 'i');
      filter.$or = [
        { title: expression },
        { content: expression },
        { tags: expression },
        { authorName: expression },
      ];
    }

    const sortOrder = sort === 'oldest' ? 1 : -1;
    const blogs = await Blog.find(filter).sort({ createdAt: sortOrder }).lean();
    res.status(200).json({ success: true, blogs });
  } catch (error) {
    next(error);
  }
};

export const getBlog = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.blogId)) {
      throw createError('Blog not found.', 404);
    }
    const blog = await Blog.findById(req.params.blogId).lean();
    if (!blog) throw createError('Blog not found.', 404);
    res.status(200).json({ success: true, blog });
  } catch (error) {
    next(error);
  }
};

export const createBlog = async (req, res, next) => {
  let uploadedImages = [];
  try {
    const authorId = getAuthUserId(req);
    if (!authorId) throw createError('Authentication is required.', 401);

    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    const category = String(req.body.category || '').trim();
    const authorName = String(req.body.authorName || 'SpeedHype member').trim().slice(0, 80);
    const tags = parseTags(req.body.tags) || [];

    if (!title || title.length > 140) throw createError('Title is required and must be 140 characters or fewer.');
    if (!content || content.length > 30000) throw createError('Content is required and must be 30,000 characters or fewer.');
    if (!category || category.length > 48) throw createError('Choose a category of 48 characters or fewer.');

    const coverFile = getUploadedFiles(req, 'coverImage')[0];
    const galleryFiles = getUploadedFiles(req, 'galleryImages');
    await uploadFiles([...(coverFile ? [coverFile] : []), ...galleryFiles], uploadedImages);
    const coverImage = coverFile ? uploadedImages[0] : null;
    const images = uploadedImages.slice(coverFile ? 1 : 0);

    const blog = await Blog.create({
      title,
      content,
      category,
      tags,
      coverImage,
      images,
      authorId,
      authorName: authorName || 'SpeedHype member',
      authorImage: String(req.body.authorImage || '').slice(0, 500),
    });
    res.status(201).json({ success: true, blog });
  } catch (error) {
    if (uploadedImages.length) await removeImagesAfterSave(uploadedImages);
    next(error);
  }
};

export const updateBlog = async (req, res, next) => {
  let uploadedImages = [];
  try {
    if (!mongoose.isValidObjectId(req.params.blogId)) throw createError('Blog not found.', 404);
    const blog = await Blog.findById(req.params.blogId);
    if (!blog) throw createError('Blog not found.', 404);
    if (blog.authorId !== getAuthUserId(req)) throw createError('You can only edit your own blogs.', 403);

    const title = req.body.title === undefined ? blog.title : String(req.body.title).trim();
    const content = req.body.content === undefined ? blog.content : String(req.body.content).trim();
    const category = req.body.category === undefined ? blog.category : String(req.body.category).trim();
    const tags = parseTags(req.body.tags);

    if (!title || title.length > 140) throw createError('Title is required and must be 140 characters or fewer.');
    if (!content || content.length > 30000) throw createError('Content is required and must be 30,000 characters or fewer.');
    if (!category || category.length > 48) throw createError('Choose a category of 48 characters or fewer.');

    const oldImages = [...(blog.coverImage ? [blog.coverImage] : []), ...blog.images];
    const keptImageUrls = parseKeptImages(req.body.keepGalleryImages);
    const galleryOrder = parseGalleryOrder(req.body.galleryOrder);
    const coverFile = getUploadedFiles(req, 'coverImage')[0];
    const galleryFiles = getUploadedFiles(req, 'galleryImages');
    const keptGallery = keptImageUrls === undefined
      ? blog.images
      : blog.images.filter((image) => keptImageUrls.includes(image.url));
    if ((galleryOrder?.length ?? (keptGallery.length + galleryFiles.length)) > 5) {
      throw createError('A blog can have up to five gallery images.');
    }

    let orderedGallery;
    if (galleryOrder) {
      const existingImages = new Map(blog.images.map((image) => [image.url, image]));
      const usedExisting = new Set();
      const usedUploads = new Set();
      orderedGallery = galleryOrder.map((item) => {
        if (item.type === 'existing') {
          const image = existingImages.get(item.url);
          if (!image || usedExisting.has(item.url)) {
            throw createError('The gallery order contains an invalid or duplicate saved image.');
          }
          usedExisting.add(item.url);
          return image;
        }
        if (item.index < 0 || item.index >= galleryFiles.length || usedUploads.has(item.index)) {
          throw createError('The gallery order contains an invalid or duplicate uploaded image.');
        }
        usedUploads.add(item.index);
        return null;
      });
      if (usedUploads.size !== galleryFiles.length) {
        throw createError('Every newly uploaded gallery image must have a position.');
      }
    }

    await uploadFiles([...(coverFile ? [coverFile] : []), ...galleryFiles], uploadedImages);
    let imageIndex = 0;
    if (coverFile) {
      blog.coverImage = uploadedImages[imageIndex++];
    } else if (req.body.removeCoverImage === 'true') {
      blog.coverImage = null;
    }
    const uploadedGallery = uploadedImages.slice(imageIndex);
    blog.images = galleryOrder
      ? galleryOrder.map((item, index) => (
        item.type === 'existing'
          ? orderedGallery[index]
          : uploadedGallery[item.index]
      ))
      : [...keptGallery, ...uploadedGallery];
    blog.title = title;
    blog.content = content;
    blog.category = category;
    if (tags !== undefined) blog.tags = tags;
    await blog.save();

    const retainedIds = new Set([
      ...(blog.coverImage ? [blog.coverImage.publicId] : []),
      ...blog.images.map((image) => image.publicId),
    ]);
    const removedImages = oldImages.filter((image) => !retainedIds.has(image.publicId));
    await removeImagesAfterSave(removedImages);
    res.status(200).json({ success: true, blog });
  } catch (error) {
    if (uploadedImages.length) await removeImagesAfterSave(uploadedImages);
    next(error);
  }
};

export const deleteBlog = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.blogId)) throw createError('Blog not found.', 404);
    const blog = await Blog.findById(req.params.blogId);
    if (!blog) throw createError('Blog not found.', 404);
    if (blog.authorId !== getAuthUserId(req)) throw createError('You can only delete your own blogs.', 403);

    const images = [...(blog.coverImage ? [blog.coverImage] : []), ...blog.images];
    await blog.deleteOne();
    await removeImagesAfterSave(images);
    res.status(200).json({ success: true, message: 'Blog deleted.' });
  } catch (error) {
    next(error);
  }
};
