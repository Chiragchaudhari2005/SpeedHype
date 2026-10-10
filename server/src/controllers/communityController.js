import mongoose from 'mongoose';
import { clerkClient, getAuth } from '@clerk/express';
import Community from '../models/Community.js';
import CommunityMessage from '../models/CommunityMessage.js';
import { uploadCommunityMedia, deleteCommunityMedia } from '../config/cloudinary.js';

const categories = ['Cars', 'Bikes', 'EVs', 'Modifications', 'Racing', 'Restoration', 'Off-road', 'General'];

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const userIdFor = (req) => getAuth(req).userId;
const getClerkProfile = async (userId) => {
  const user = await clerkClient.users.getUser(userId);
  return {
    displayName: user.fullName || user.username || user.primaryEmailAddress?.emailAddress || 'SpeedHype member',
    imageUrl: user.imageUrl || '',
  };
};
const getCommunity = async (communityId) => {
  if (!mongoose.isValidObjectId(communityId)) throw createError('Community not found.', 404);
  const community = await Community.findById(communityId);
  if (!community) throw createError('Community not found.', 404);
  return community;
};
const getMembers = (community) => (Array.isArray(community.members) ? community.members : []);
const isMember = (community, userId) => getMembers(community).some((member) => member.userId === userId);
const safeCommunity = (community, userId) => ({
  ...community.toObject(),
  memberCount: getMembers(community).length,
  isMember: isMember(community, userId),
});
const safeMessage = (message) => ({
  _id: message._id,
  communityId: message.communityId,
  authorId: message.authorId,
  authorName: message.authorName,
  authorImage: message.authorImage,
  text: message.text,
  media: message.media,
  createdAt: message.createdAt,
});

const cleanUpMedia = async (media) => {
  if (!media?.publicId) return;
  try {
    await deleteCommunityMedia(media);
  } catch (error) {
    console.error('Failed to remove community media from Cloudinary:', error.message);
  }
};

export const listCommunities = async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const category = String(req.query.category || '').trim();
    if (search.length > 100) throw createError('Search must be 100 characters or fewer.');
    if (category && category !== 'all' && !categories.includes(category)) {
      throw createError('Choose a valid community category.');
    }

    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: new RegExp(escaped, 'i') },
        { description: new RegExp(escaped, 'i') },
      ];
    }

    const userId = userIdFor(req);
    if (req.query.mine === 'true') filter['members.userId'] = userId;
    const communities = await Community.find(filter).sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      communities: communities.map((community) => ({
        ...community,
        memberCount: getMembers(community).length,
        isMember: isMember(community, userId),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getCommunityDetails = async (req, res, next) => {
  try {
    const community = await getCommunity(req.params.communityId);
    res.json({
      success: true,
      community: safeCommunity(community, userIdFor(req)),
    });
  } catch (error) {
    next(error);
  }
};

export const createCommunity = async (req, res, next) => {
  let coverImage;
  try {
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const category = String(req.body.category || '').trim();
    if (name.length < 3 || name.length > 60) throw createError('Community name must be 3–60 characters.');
    if (description.length < 10 || description.length > 1200) throw createError('Description must be 10–1,200 characters.');
    if (!categories.includes(category)) throw createError('Choose a valid community category.');

    const creator = await getClerkProfile(userIdFor(req));
    if (req.file) coverImage = await uploadCommunityMedia(req.file, 'image');
    const community = await Community.create({
      name,
      description,
      category,
      coverImage: coverImage || undefined,
      creatorId: userIdFor(req),
      creatorName: creator.displayName.slice(0, 80),
      creatorImage: creator.imageUrl,
      members: [{
        userId: userIdFor(req),
        displayName: creator.displayName.slice(0, 80),
        imageUrl: creator.imageUrl,
      }],
    });
    res.status(201).json({ success: true, community: safeCommunity(community, userIdFor(req)) });
  } catch (error) {
    if (coverImage) await cleanUpMedia(coverImage);
    if (error.code === 11000) return next(createError('A community with that name already exists.', 409));
    next(error);
  }
};

export const updateCommunity = async (req, res, next) => {
  let newCover;
  try {
    const community = await getCommunity(req.params.communityId);
    if (community.creatorId !== userIdFor(req)) throw createError('Only the community creator can edit it.', 403);
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const category = String(req.body.category || '').trim();
    if (name.length < 3 || name.length > 60) throw createError('Community name must be 3–60 characters.');
    if (description.length < 10 || description.length > 1200) throw createError('Description must be 10–1,200 characters.');
    if (!categories.includes(category)) throw createError('Choose a valid community category.');

    if (req.file) newCover = await uploadCommunityMedia(req.file, 'image');
    const previousCover = community.coverImage?.publicId ? community.coverImage : null;
    community.name = name;
    community.description = description;
    community.category = category;
    if (newCover) community.coverImage = newCover;
    await community.save();
    if (newCover && previousCover) await cleanUpMedia(previousCover);
    res.json({ success: true, community: safeCommunity(community, userIdFor(req)) });
  } catch (error) {
    if (newCover) await cleanUpMedia(newCover);
    if (error.code === 11000) return next(createError('A community with that name already exists.', 409));
    next(error);
  }
};

export const deleteCommunity = async (req, res, next) => {
  try {
    const community = await getCommunity(req.params.communityId);
    if (community.creatorId !== userIdFor(req)) throw createError('Only the community creator can delete it.', 403);
    const messages = await CommunityMessage.find({ communityId: community._id }).select('media').lean();
    await Promise.all([
      CommunityMessage.deleteMany({ communityId: community._id }),
      community.deleteOne(),
    ]);
    await Promise.all(messages.filter((message) => message.media?.publicId).map((message) => cleanUpMedia(message.media)));
    if (community.coverImage?.publicId) await cleanUpMedia(community.coverImage);
    res.json({ success: true, message: 'Community deleted.' });
  } catch (error) {
    next(error);
  }
};

export const joinCommunity = async (req, res, next) => {
  try {
    const community = await getCommunity(req.params.communityId);
    if (isMember(community, userIdFor(req))) {
      res.json({ success: true, community: safeCommunity(community, userIdFor(req)) });
      return;
    }
    const memberProfile = await getClerkProfile(userIdFor(req));
    await Community.updateOne(
      { _id: community._id, 'members.userId': { $ne: userIdFor(req) } },
      {
        $push: {
          members: {
            userId: userIdFor(req),
            displayName: memberProfile.displayName.slice(0, 80),
            imageUrl: memberProfile.imageUrl,
          },
        },
      },
    );
    const updated = await Community.findById(community._id);
    res.json({ success: true, community: safeCommunity(updated, userIdFor(req)) });
  } catch (error) {
    next(error);
  }
};

export const leaveCommunity = async (req, res, next) => {
  try {
    const community = await getCommunity(req.params.communityId);
    if (community.creatorId === userIdFor(req)) {
      throw createError('The creator cannot leave their own community. Delete it instead.', 400);
    }
    await Community.updateOne(
      { _id: community._id },
      { $pull: { members: { userId: userIdFor(req) } } },
    );
    const updated = await Community.findById(community._id);
    res.json({ success: true, community: safeCommunity(updated, userIdFor(req)) });
  } catch (error) {
    next(error);
  }
};

export const getCommunityMessages = async (req, res, next) => {
  try {
    const community = await getCommunity(req.params.communityId);
    if (!isMember(community, userIdFor(req))) throw createError('Join this community to view its chat.', 403);
    const messages = await CommunityMessage.find({ communityId: community._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    next(error);
  }
};

export const createSocketMessage = async ({ communityId, userId, userName, userImage, text, media }) => {
  const community = await getCommunity(communityId);
  if (!isMember(community, userId)) throw createError('Join this community before sending messages.', 403);
  const normalizedText = String(text || '').trim();
  if (normalizedText.length > 2000) throw createError('Messages must be 2,000 characters or fewer.');
  if (!normalizedText && !media) throw createError('Write a message or attach an image/video.');

  let uploadedMedia;
  if (media) {
    const { filename, mimeType, buffer: rawBuffer } = media;
    const isImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType);
    const isVideo = ['video/mp4', 'video/webm', 'video/quicktime'].includes(mimeType);
    if (!isImage && !isVideo) throw createError('Use JPG, PNG, WebP, GIF, MP4, WebM, or MOV media.');
    const buffer = Buffer.isBuffer(rawBuffer)
      ? rawBuffer
      : rawBuffer instanceof ArrayBuffer
        ? Buffer.from(rawBuffer)
        : ArrayBuffer.isView(rawBuffer)
          ? Buffer.from(rawBuffer.buffer, rawBuffer.byteOffset, rawBuffer.byteLength)
          : null;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > 12 * 1024 * 1024) {
      throw createError('Media must be smaller than 12 MB.');
    }
    uploadedMedia = await uploadCommunityMedia(
      { buffer, originalname: filename, mimetype: mimeType },
      isVideo ? 'video' : 'image',
    );
  }

  try {
    const message = await CommunityMessage.create({
      communityId: community._id,
      authorId: userId,
      authorName: String(userName || 'SpeedHype member').slice(0, 80),
      authorImage: String(userImage || '').slice(0, 500),
      text: normalizedText,
      media: uploadedMedia || null,
    });
    return safeMessage(message);
  } catch (error) {
    if (uploadedMedia) await cleanUpMedia(uploadedMedia);
    throw error;
  }
};

export { createError };
