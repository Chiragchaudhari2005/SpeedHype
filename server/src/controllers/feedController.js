import Blog from '../models/Blog.js';
import Community from '../models/Community.js';
import Vehicle from '../models/Vehicle.js';
import NotificationState from '../models/NotificationState.js';
import { getAuth } from '@clerk/express';

const currentUserId = (req) => getAuth(req).userId;

const makeFeedItems = ({ blogs, communities, vehicles }) => [
  ...blogs.map((blog) => ({
    id: `blog:${blog._id}`,
    type: 'blog',
    title: blog.title,
    description: blog.content,
    category: blog.category,
    image: blog.coverImage?.url || '',
    authorName: blog.authorName,
    authorImage: blog.authorImage,
    createdAt: blog.createdAt,
    href: `/blogs/${blog._id}`,
    tags: blog.tags || [],
  })),
  ...communities.map((community) => ({
    id: `community:${community._id}`,
    type: 'community',
    title: community.name,
    description: community.description,
    category: community.category,
    image: community.coverImage?.url || '',
    authorName: community.creatorName,
    authorImage: community.creatorImage,
    memberCount: community.members?.length || 0,
    createdAt: community.createdAt,
    href: `/communities/${community._id}`,
  })),
  ...vehicles.map((vehicle) => ({
    id: `vehicle:${vehicle._id}`,
    type: 'vehicle',
    title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    description: vehicle.summary,
    category: vehicle.category,
    image: vehicle.imageUrl,
    createdAt: vehicle.createdAt,
    href: '/cars',
  })),
].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

export const getFeed = async (req, res, next) => {
  try {
    const userId = currentUserId(req);
    const [blogs, communities, vehicles, joinedCommunities, blogCount, communityCount, vehicleCount] = await Promise.all([
      Blog.find().sort({ createdAt: -1 }).limit(30).lean(),
      Community.find().sort({ createdAt: -1 }).limit(30).lean(),
      Vehicle.find().sort({ createdAt: -1 }).limit(30).lean(),
      Community.find({ 'members.userId': userId })
        .select('_id')
        .lean(),
      Blog.countDocuments(),
      Community.countDocuments(),
      Vehicle.countDocuments(),
    ]);

    const trendingSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const trendingBlogs = await Blog.find({ createdAt: { $gte: trendingSince } })
      .select('tags')
      .lean();
    const tagCounts = new Map();
    trendingBlogs.forEach((blog) => {
      (blog.tags || []).forEach((rawTag) => {
        const tag = String(rawTag).trim().replace(/^#+/, '');
        if (tag) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const joinedIds = new Set(joinedCommunities.map((community) => String(community._id)));
    const suggestedCommunities = communities
      .filter((community) => !joinedIds.has(String(community._id)))
      .sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0))
      .slice(0, 5)
      .map((community) => ({
        id: community._id,
        name: community.name,
        category: community.category,
        coverImage: community.coverImage?.url || '',
        memberCount: community.members?.length || 0,
        href: `/communities/${community._id}`,
      }));

    const items = makeFeedItems({ blogs, communities, vehicles }).slice(0, 40);
    res.json({
      success: true,
      items,
      trendingTopics: [...tagCounts.entries()]
        .map(([tag, postCount]) => ({ tag, postCount }))
        .sort((a, b) => b.postCount - a.postCount || a.tag.localeCompare(b.tag))
        .slice(0, 8),
      suggestedCommunities,
      counts: {
        blogs: blogCount,
        communities: communityCount,
        vehicles: vehicleCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (req, res, next) => {
  try {
    const userId = currentUserId(req);
    const [blogs, communities, vehicles, state] = await Promise.all([
      Blog.find().sort({ createdAt: -1 }).limit(20).lean(),
      Community.find().sort({ createdAt: -1 }).limit(20).lean(),
      Vehicle.find().sort({ createdAt: -1 }).limit(20).lean(),
      NotificationState.findOne({ userId }).lean(),
    ]);
    const items = makeFeedItems({ blogs, communities, vehicles })
      .filter((item) => ['blog', 'community', 'vehicle'].includes(item.type))
      .slice(0, 20)
      .map((item) => ({
        ...item,
        unread: state ? new Date(item.createdAt) > state.lastReadAt : false,
      }));

    res.json({
      success: true,
      notifications: items,
      unreadCount: items.filter((item) => item.unread).length,
    });
  } catch (error) {
    next(error);
  }
};

export const markNotificationsRead = async (req, res, next) => {
  try {
    const userId = currentUserId(req);
    const lastReadAt = new Date();
    await NotificationState.findOneAndUpdate(
      { userId },
      { $set: { lastReadAt } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    res.json({ success: true, lastReadAt });
  } catch (error) {
    next(error);
  }
};
