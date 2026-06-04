const Incident = require('../models/Incident');
const User = require('../models/User');
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

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
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
 * Get incidents with filtering and pagination.
 * Query params: category, district, upazila, status (default: verified, use status=all to return all statuses), page, limit, search
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getIncidents = async (req, res, next) => {
  try {
    const {
      category,
      district,
      upazila,
      status,
      page = 1,
      limit = 10,
      search,
    } = req.query;

    const query = {};

    if (category) query.category = category;
    if (district) query.district = district;
    if (upazila) query.upazila = upazila;
    if (status && status !== 'all') query.status = status;
    if (!status) query.status = 'verified';

    if (search) {
      query.$text = { $search: search };
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const incidents = await Incident.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Hide reporter name if anonymous and user is not the reporter
    const processedIncidents = incidents.map((incident) => {
      if (incident.anonymous && req.user?.id !== incident.reporterId.toString()) {
        return { ...incident, reporterName: 'Anonymous' };
      }
      return incident;
    });

    const totalCount = await Incident.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: processedIncidents,
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
 * Get incidents reported by the current user.
 * Query params: status, page, limit
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getMyIncidents = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { reporterId: req.user._id };
    if (status) query.status = status;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const incidents = await Incident.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalCount = await Incident.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: incidents,
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
 * Get a single incident by ID.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getIncidentById = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id).populate(
      'moderatedBy',
      'name'
    );

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    // Hide reporter name if anonymous and user is not the reporter
    if (incident.anonymous && req.user?.id !== incident.reporterId.toString()) {
      incident.reporterName = 'Anonymous';
    }

    res.json({ success: true, data: incident });
  } catch (err) {
    return next(err);
  }
};

/**
 * Create a new incident report.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const createIncident = async (req, res, next) => {
  try {
    const {
      category,
      title,
      description,
      division,
      district,
      upazila,
      address,
      incidentDate,
      incidentTime,
      photos,
      anonymous,
    } = req.body;

    // Validate required fields
    if (
      !category ||
      !title ||
      !description ||
      !division ||
      !district ||
      !upazila ||
      !incidentDate ||
      !incidentTime
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Check incidentDate is not in the future
    const incidentDateTime = new Date(incidentDate);
    if (incidentDateTime > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Incident date cannot be in the future',
      });
    }

    const locationPayload = buildLocationPayload(req.body);
    if (locationPayload.error) {
      return res.status(400).json({ success: false, message: locationPayload.error });
    }

    // Create incident
    const incident = await Incident.create({
      reporterId: req.user._id,
      reporterName: anonymous ? req.user.name : req.user.name,
      anonymous: anonymous || false,
      category,
      title,
      description,
      division,
      district,
      upazila,
      address: address || '',
      location: locationPayload.data.location,
      preciseAddress: locationPayload.data.preciseAddress,
      hasMapLocation: locationPayload.data.hasMapLocation,
      locationMethod: locationPayload.data.locationMethod,
      incidentDate,
      incidentTime,
      photos: photos || [],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Increment user's report count
    await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { reportCount: 1 } },
      { new: true }
    );

    await createNotificationsForAllUsers({
      senderId: req.user._id,
      senderName: req.user.name,
      senderAvatar: req.user.avatar || '',
      type: 'new_incident',
      title: `New Incident: ${incident.category.replace(/_/g, ' ')}`,
      message: `${req.user.name} reported a ${incident.category.replace(/_/g, ' ')} incident in ${incident.district}, ${incident.upazila}. "${incident.title}"`,
      link: `/incidents/${incident._id}`,
      referenceId: incident._id,
      referenceType: 'incident',
    });

    res.status(201).json({ success: true, data: incident });
  } catch (err) {
    return next(err);
  }
};

/**
 * Update an incident report.
 * Only pending incidents can be edited by reporter or admin.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const updateIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    // Check ownership or admin
    const isOwner = incident.reporterId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own incidents',
      });
    }

    // Only allow edit if status is pending
    if (incident.status !== 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Only pending reports can be edited',
      });
    }

    // Update allowed fields
    const allowedFields = [
      'category',
      'title',
      'description',
      'address',
      'incidentDate',
      'incidentTime',
      'photos',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        incident[field] = req.body[field];
      }
    });

    // Validate incidentDate is not in the future
    if (req.body.incidentDate) {
      const incidentDateTime = new Date(req.body.incidentDate);
      if (incidentDateTime > new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Incident date cannot be in the future',
        });
      }
    }

    const locationPayload = buildLocationPayload(req.body);
    if (locationPayload.error) {
      return res.status(400).json({ success: false, message: locationPayload.error });
    }

    if (locationPayload.data.hasMapLocation) {
      incident.location = locationPayload.data.location;
      incident.preciseAddress = locationPayload.data.preciseAddress;
      incident.hasMapLocation = true;
      incident.locationMethod = locationPayload.data.locationMethod;
    } else {
      if (req.body.preciseAddress !== undefined) {
        incident.preciseAddress = req.body.preciseAddress;
      }
      if (
        req.body.locationMethod !== undefined &&
        VALID_LOCATION_METHODS.includes(req.body.locationMethod)
      ) {
        incident.locationMethod = req.body.locationMethod;
      }
      if (req.body.hasMapLocation !== undefined) {
        incident.hasMapLocation = !!req.body.hasMapLocation;
        if (!incident.hasMapLocation) {
          incident.location = { ...DEFAULT_LOCATION };
        }
      }
    }

    await incident.save();

    res.json({ success: true, data: incident });
  } catch (err) {
    return next(err);
  }
};

/**
 * Delete an incident report.
 * Only reporter or admin can delete.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const deleteIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    // Check ownership or admin
    const isOwner = incident.reporterId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own incidents',
      });
    }

    await Incident.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Incident deleted' });
  } catch (err) {
    return next(err);
  }
};

/**
 * Update incident status (moderator/admin only).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const updateStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;

    // Validate status
    const validStatuses = ['pending', 'under_review', 'verified', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    // Require rejection reason if rejecting
    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    // Update status and moderation info
    incident.status = status;
    incident.moderatedBy = req.user._id;
    incident.moderatedAt = new Date();

    if (status === 'rejected') {
      incident.rejectionReason = rejectionReason;

      // Increment reporter's rejected count
      await User.findByIdAndUpdate(
        incident.reporterId,
        { $inc: { rejectedCount: 1 } },
        { new: true }
      );
    }

    // Set expiresAt for verified incidents
    if (status === 'verified' && !incident.expiresAt) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      incident.expiresAt = thirtyDaysFromNow;
    }

    await incident.save();

    if (status === 'verified') {
      await createNotificationForUser({
        recipientId: incident.reporterId,
        senderId: req.user._id,
        senderName: req.user.name,
        senderAvatar: req.user.avatar || '',
        type: 'incident_verified',
        title: 'Your Report Was Verified ✅',
        message: `Your incident report "${incident.title}" has been verified and is now publicly visible.`,
        link: `/incidents/${incident._id}`,
        referenceId: incident._id,
        referenceType: 'incident',
      });
    }

    if (status === 'rejected') {
      await createNotificationForUser({
        recipientId: incident.reporterId,
        senderId: req.user._id,
        senderName: req.user.name,
        senderAvatar: req.user.avatar || '',
        type: 'incident_rejected',
        title: 'Your Report Was Rejected ❌',
        message: `Your incident report "${incident.title}" was rejected. Reason: ${rejectionReason}`,
        link: `/dashboard/my-reports`,
        referenceId: incident._id,
        referenceType: 'incident',
      });
    }

    res.json({ success: true, data: incident });
  } catch (err) {
    return next(err);
  }
};

/**
 * Flag an incident report.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getNearbyIncidents = async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseInt(req.query.radius, 10) || 5000;
    const limit = parseInt(req.query.limit, 10) || 20;
    const category = req.query.category || null;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'lat and lng query params are required',
      });
    }

    const query = {
      status: 'verified',
      hasMapLocation: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radius,
        },
      },
    };

    if (category) query.category = category;

    const incidents = await Incident.find(query)
      .limit(limit)
      .select(
        'title category status district upazila location preciseAddress incidentDate incidentTime reporterName anonymous'
      )
      .lean();

    const withDistance = incidents.map((inc) => ({
      ...inc,
      distanceMeters: calculateDistance(
        lat,
        lng,
        inc.location.coordinates[1],
        inc.location.coordinates[0]
      ),
    }));

    res.json({
      success: true,
      incidents: withDistance,
      count: withDistance.length,
      searchCenter: { lat, lng },
      radiusMeters: radius,
    });
  } catch (err) {
    next(err);
  }
};

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
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const flagIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    // Check if already flagged by this user
    const alreadyFlagged = incident.flaggedBy.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (alreadyFlagged) {
      return res.status(400).json({
        success: false,
        message: 'You have already flagged this incident',
      });
    }

    // Add user to flaggedBy and increment flagCount
    incident.flaggedBy.push(req.user._id);
    incident.flagCount += 1;

    // If flagCount >= 5, set status to under_review
    if (incident.flagCount >= 5) {
      incident.status = 'under_review';
    }

    await incident.save();

    res.json({
      success: true,
      message: 'Incident flagged',
      flagCount: incident.flagCount,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getIncidents,
  getMyIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  deleteIncident,
  updateStatus,
  flagIncident,
  getNearbyIncidents,
};
