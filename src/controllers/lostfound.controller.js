const LostFound = require('../models/LostFound');
const {
  createNotificationsForAllUsers,
  createNotificationForUser,
} = require('../utils/notificationHelper');

const VALID_LOCATION_METHODS = ['gps', 'manual_pin', 'address_search', 'not_set'];
const DEFAULT_LOCATION = { type: 'Point', coordinates: [0, 0] };

/**
 * Validate incoming latitude / longitude values.
 * @param {*} latitude
 * @param {*} longitude
 * @returns {string|null}
 */
function validateCoordinates(latitude, longitude) {
  if (latitude === undefined && longitude === undefined) {
    return null;
  }

  if (typeof latitude !== 'number' || typeof longitude !== 'number' || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return 'Invalid coordinates';
  }

  if (latitude < -90 || latitude > 90) {
    return 'Latitude must be between -90 and 90';
  }

  if (longitude < -180 || longitude > 180) {
    return 'Longitude must be between -180 and 180';
  }

  return null;
}

/**
 * Build location payload from request body.
 * @param {import('express').Request['body']} body
 * @returns {{data?: {location: object, preciseAddress: string, hasMapLocation: boolean, locationMethod: string}, error?: string}}
 */
function buildLocationPayload(body) {
  const { latitude, longitude, preciseAddress, locationMethod } = body;
  const payload = {
    location: { ...DEFAULT_LOCATION },
    preciseAddress: '',
    hasMapLocation: false,
    locationMethod: 'not_set',
  };

  if (latitude !== undefined || longitude !== undefined) {
    const validationError = validateCoordinates(latitude, longitude);
    if (validationError) {
      return { error: validationError };
    }

    payload.location = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };
    payload.preciseAddress = preciseAddress || '';
    payload.hasMapLocation = true;
    payload.locationMethod = VALID_LOCATION_METHODS.includes(locationMethod)
      ? locationMethod
      : 'manual_pin';
  }

  return { data: payload };
}

/**
 * Haversine distance formula helper.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number}
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Get all lost & found posts with filtering and pagination.
 * Query params: type, district, status (default: 'active'), page, limit, search (itemName)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getAllPosts = async (req, res, next) => {
  try {
    const { type, district, status = 'active', page = 1, limit = 10, search } = req.query;

    const query = {};

    if (type) query.type = type;
    if (district) query.district = district;
    if (status && status !== 'all') query.status = status;

    if (search) {
      query.itemName = { $regex: search, $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const posts = await LostFound.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const processedPosts = posts.map((post) => {
      if (!post.showContact) {
        const { contactNumber, ...rest } = post;
        return rest;
      }
      return post;
    });

    const totalCount = await LostFound.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: processedPosts,
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get posts created by the current user.
 * Query params: status, page, limit
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getMyPosts = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { userId: req.user._id };
    if (status) query.status = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const posts = await LostFound.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalCount = await LostFound.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: posts,
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get a single post by ID.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getPostById = async (req, res, next) => {
  try {
    const post = await LostFound.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const isOwner = post.userId.toString() === req.user._id.toString();

    if (!post.showContact && !isOwner) {
      const { contactNumber, ...postData } = post.toObject();
      return res.json({ success: true, data: postData });
    }

    res.json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
};

/**
 * Create a new lost & found post.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const createPost = async (req, res, next) => {
  try {
    const {
      type,
      itemName,
      category,
      description,
      photo,
      division,
      district,
      upazila,
      exactPlace,
      dateLostFound,
      showContact,
      contactNumber,
    } = req.body;

    if (!type || !itemName || !category || !description || !district || !upazila || !dateLostFound) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, itemName, category, description, district, upazila, dateLostFound',
      });
    }

    const locationPayload = buildLocationPayload(req.body);
    if (locationPayload.error) {
      return res.status(400).json({ success: false, message: locationPayload.error });
    }

    const post = await LostFound.create({
      userId: req.user._id,
      userName: req.user.name,
      type,
      itemName,
      category,
      description,
      photo: photo || '',
      division: division || '',
      district,
      upazila,
      exactPlace: exactPlace || '',
      location: locationPayload.data.location,
      preciseAddress: locationPayload.data.preciseAddress,
      hasMapLocation: locationPayload.data.hasMapLocation,
      locationMethod: locationPayload.data.locationMethod,
      dateLostFound,
      showContact: showContact || false,
      contactNumber: showContact ? contactNumber || '' : '',
    });

    await createNotificationsForAllUsers({
      senderId: req.user._id,
      senderName: req.user.name,
      senderAvatar: req.user.avatar || '',
      type: 'new_lost_found',
      title: `${post.type === 'lost' ? '🔍 Lost Item' : '✅ Found Item'}: ${post.itemName}`,
      message: `${req.user.name} posted a ${post.type} item — "${post.itemName}" in ${post.district}, ${post.upazila}.`,
      link: `/lost-found/${post._id}`,
      referenceId: post._id,
      referenceType: 'lost_found',
    });

    res.status(201).json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
};

/**
 * Update a lost & found post.
 * Only active posts can be updated. Check ownership or admin.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const updatePost = async (req, res, next) => {
  try {
    const post = await LostFound.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const isOwner = post.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own posts',
      });
    }

    if (post.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Only active posts can be edited',
      });
    }

    const allowedFields = [
      'type',
      'itemName',
      'category',
      'description',
      'photo',
      'exactPlace',
      'dateLostFound',
      'showContact',
      'contactNumber',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        post[field] = req.body[field];
      }
    });

    if (req.body.showContact === false) {
      post.contactNumber = '';
    }

    const locationPayload = buildLocationPayload(req.body);
    if (locationPayload.error) {
      return res.status(400).json({ success: false, message: locationPayload.error });
    }

    if (locationPayload.data.hasMapLocation) {
      post.location = locationPayload.data.location;
      post.preciseAddress = locationPayload.data.preciseAddress;
      post.hasMapLocation = true;
      post.locationMethod = locationPayload.data.locationMethod;
    } else {
      if (req.body.preciseAddress !== undefined) {
        post.preciseAddress = req.body.preciseAddress;
      }
      if (req.body.locationMethod !== undefined && VALID_LOCATION_METHODS.includes(req.body.locationMethod)) {
        post.locationMethod = req.body.locationMethod;
      }
      if (req.body.hasMapLocation !== undefined) {
        post.hasMapLocation = !!req.body.hasMapLocation;
        if (!post.hasMapLocation) {
          post.location = { ...DEFAULT_LOCATION };
        }
      }
    }

    await post.save();

    res.json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get posts near a given coordinate.
 * Query params: lat, lng, radius, limit, category
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getNearbyPosts = async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseInt(req.query.radius, 10) || 5000;
    const limit = parseInt(req.query.limit, 10) || 20;
    const category = req.query.category || null;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'lat and lng query params are required' });
    }

    const query = {
      status: 'active',
      hasMapLocation: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radius,
        },
      },
    };

    if (category) query.category = category;

    const posts = await LostFound.find(query)
      .limit(limit)
      .select('type itemName category status district upazila location preciseAddress dateLostFound userName')
      .lean();

    const withDistance = posts.map((post) => ({
      ...post,
      distanceMeters: calculateDistance(
        lat,
        lng,
        post.location.coordinates[1],
        post.location.coordinates[0]
      ),
    }));

    res.json({
      success: true,
      posts: withDistance,
      count: withDistance.length,
      searchCenter: { lat, lng },
      radiusMeters: radius,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Mark a post as resolved.
 * Check ownership or admin.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const markResolved = async (req, res, next) => {
  try {
    const post = await LostFound.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const isOwner = post.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only resolve your own posts',
      });
    }

    post.status = 'resolved';
    await post.save();

    await createNotificationForUser({
      recipientId: post.userId,
      senderId: req.user._id,
      senderName: req.user.name,
      senderAvatar: req.user.avatar || '',
      type: 'lost_found_resolved',
      title: 'Lost & Found Post Resolved ✅',
      message: `Your post for "${post.itemName}" has been marked as resolved.`,
      link: `/dashboard/my-lost-found`,
      referenceId: post._id,
      referenceType: 'lost_found',
    });

    res.json({ success: true, data: post });
  } catch (err) {
    return next(err);
  }
};

/**
 * Delete a lost & found post.
 * Check ownership or admin.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const deletePost = async (req, res, next) => {
  try {
    const post = await LostFound.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const isOwner = post.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own posts',
      });
    }

    await LostFound.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getAllPosts,
  getMyPosts,
  getPostById,
  createPost,
  updatePost,
  getNearbyPosts,
  markResolved,
  deletePost,
};
