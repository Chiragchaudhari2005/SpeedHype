import Blog from '../models/Blog.js';
import Community from '../models/Community.js';
import Vehicle from '../models/Vehicle.js';
import Car from '../models/Car.js';
import NotificationState from '../models/NotificationState.js';
import { getAuth } from '@clerk/express';

const currentUserId = (req) => getAuth(req).userId;

const makeFeedItems = ({ blogs, communities, vehicles, cars }) => [
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
  ...cars.map((car) => ({
    id: `catalog-car:${car._id}`,
    type: 'vehicle',
    title: `${car.launchYear} ${car.brand} ${car.model}${car.variant && car.variant !== 'Base' ? ` ${car.variant}` : ''}`,
    description: [car.category, car.fuelType, car.transmission].filter(Boolean).join(' · '),
    category: car.category,
    image: car.images?.[0]?.url || '',
    createdAt: car.createdAt,
    href: `/cars/catalog/${car._id}`,
  })),
].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

export const getFeed = async (req, res, next) => {
  try {
    const userId = currentUserId(req);
    const [blogs, communities, vehicles, cars, joinedCommunities, blogCount, communityCount, vehicleCount, catalogCarCount] = await Promise.all([
      Blog.find().sort({ createdAt: -1 }).limit(30).lean(),
      Community.find().sort({ createdAt: -1 }).limit(30).lean(),
      Vehicle.find().sort({ createdAt: -1 }).limit(30).lean(),
      Car.find().sort({ createdAt: -1 }).limit(30).lean(),
      Community.find({ 'members.userId': userId })
        .select('_id')
        .lean(),
      Blog.countDocuments(),
      Community.countDocuments(),
      Vehicle.countDocuments(),
      Car.countDocuments(),
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

    const items = makeFeedItems({ blogs, communities, vehicles, cars }).slice(0, 40);
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
        vehicles: vehicleCount + catalogCarCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (req, res, next) => {
  try {
    const userId = currentUserId(req);
    const [blogs, communities, vehicles, cars, state] = await Promise.all([
      Blog.find().sort({ createdAt: -1 }).limit(20).lean(),
      Community.find().sort({ createdAt: -1 }).limit(20).lean(),
      Vehicle.find().sort({ createdAt: -1 }).limit(20).lean(),
      Car.find().sort({ createdAt: -1 }).limit(20).lean(),
      NotificationState.findOne({ userId }).lean(),
    ]);
    const items = makeFeedItems({ blogs, communities, vehicles, cars })
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

export const getDashboard = async (req, res, next) => {
  try {
    const userId = currentUserId(req);

    const [
      userBlogsCount,
      userCommunitiesCount,
      userVehiclesCount,
      approvedCarsCount,
      userBlogs,
      userCommunities,
      userVehicles,
      recentApprovedCars,
    ] = await Promise.all([
      Blog.countDocuments({ authorId: userId }),
      Community.countDocuments({ 'members.userId': userId }),
      Vehicle.countDocuments({ addedBy: userId }),
      Car.countDocuments({ reviewStatus: 'approved' }),
      Blog.find({ authorId: userId }).sort({ createdAt: -1 }).limit(6).lean(),
      Community.find({ 'members.userId': userId }).sort({ updatedAt: -1 }).limit(6).lean(),
      Vehicle.find({ addedBy: userId }).sort({ createdAt: -1 }).limit(6).lean(),
      Car.find({ reviewStatus: 'approved' }).sort({ createdAt: -1 }).limit(4).lean(),
    ]);

    // Build real user activity and platform highlights timeline
    const recentActivities = [
      ...userBlogs.map((b) => ({
        id: `my-blog-${b._id}`,
        type: 'blog',
        action: `Published story "${b.title}"`,
        category: b.category,
        createdAt: b.createdAt,
        href: `/blogs/${b._id}`,
        isOwn: true,
      })),
      ...userCommunities.map((c) => ({
        id: `my-comm-${c._id}`,
        type: 'community',
        action: `Active in community "${c.name}"`,
        category: c.category,
        createdAt: c.createdAt,
        href: `/communities/${c._id}`,
        isOwn: true,
      })),
      ...userVehicles.map((v) => ({
        id: `my-veh-${v._id}`,
        type: 'vehicle',
        action: `Added ${v.year} ${v.make} ${v.model} to garage`,
        category: v.category,
        createdAt: v.createdAt,
        href: '/cars',
        isOwn: true,
      })),
      ...recentApprovedCars.map((car) => ({
        id: `car-${car._id}`,
        type: 'car',
        action: `Verified ${car.launchYear} ${car.brand} ${car.model} added to catalog`,
        category: car.category,
        createdAt: car.createdAt,
        href: `/cars/catalog/${car._id}`,
        isOwn: false,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

    res.json({
      success: true,
      stats: {
        blogsCount: userBlogsCount,
        communitiesCount: userCommunitiesCount,
        vehiclesCount: userVehiclesCount,
        catalogCarsCount: approvedCarsCount,
      },
      userBlogs,
      userCommunities,
      userVehicles,
      recentApprovedCars,
      recentActivities,
    });
  } catch (error) {
    next(error);
  }
};
