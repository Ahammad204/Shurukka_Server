const EmergencyContact = require('../models/EmergencyContact');
const { seedData } = require('../models/EmergencyContact');

/**
 * Get emergency contacts with optional filtering and pagination.
 * National contacts always appear at the top.
 * Query params: district, category, division, search, page, limit
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getContacts = async (req, res, next) => {
  try {
    const { district, category, division, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (district) {
      query.$or = [{ isNational: true }, { district }];
    }
    if (category) query.category = category;
    if (division) query.division = division;
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Get national contacts separately
    const nationalContacts = await EmergencyContact.find({ isNational: true })
      .lean();

    // Get filtered contacts
    const contacts = await EmergencyContact.find(query)
      .sort({ isNational: -1, district: 1, category: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalCount = await EmergencyContact.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      contacts,
      nationalContacts,
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
 * Get a single emergency contact by ID.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getContactById = async (req, res, next) => {
  try {
    const contact = await EmergencyContact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    res.json({ success: true, data: contact });
  } catch (err) {
    return next(err);
  }
};

/**
 * Create a new emergency contact (admin only).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const createContact = async (req, res, next) => {
  try {
    const { name, category, division, district, phones } = req.body;

    // Validate required fields
    if (!name || !category || !division || !district || !phones || phones.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, category, division, district, phones (array with at least 1 item)',
      });
    }

    const contact = await EmergencyContact.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: contact });
  } catch (err) {
    return next(err);
  }
};

/**
 * Update an emergency contact by ID (admin only).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const updateContact = async (req, res, next) => {
  try {
    const contact = await EmergencyContact.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    res.json({ success: true, data: contact });
  } catch (err) {
    return next(err);
  }
};

/**
 * Delete an emergency contact by ID (admin only).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const deleteContact = async (req, res, next) => {
  try {
    const contact = await EmergencyContact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    res.json({ success: true, message: 'Contact deleted' });
  } catch (err) {
    return next(err);
  }
};

/**
 * Seed the database with initial emergency contacts (admin only).
 * Uses insertMany with ordered: false to ignore duplicates.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const seedContacts = async (req, res, next) => {
  try {
    const result = await EmergencyContact.insertMany(seedData, {
      ordered: false,
    }).catch((err) => {
      // Handle duplicate key errors gracefully
      if (err.code === 11000) {
        return err.insertedDocs;
      }
      throw err;
    });

    const insertedCount = Array.isArray(result) ? result.length : 1;

    res.json({
      success: true,
      message: `Seeded ${insertedCount} emergency contacts`,
      count: insertedCount,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  seedContacts,
};
