const mongoose = require('mongoose');

/**
 * Lost & Found schema for LocalGuard community lost/found item listings.
 * @type {import('mongoose').Schema}
 */
const lostFoundSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['lost', 'found'],
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['electronics', 'documents', 'bag_wallet', 'jewelry', 'pet', 'other'],
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    photo: {
      type: String,
      default: '',
    },
    division: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    upazila: {
      type: String,
      required: true,
    },
    exactPlace: {
      type: String,
      default: '',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    preciseAddress: {
      type: String,
      default: '',
      trim: true,
    },
    hasMapLocation: {
      type: Boolean,
      default: false,
    },
    locationMethod: {
      type: String,
      enum: ['gps', 'manual_pin', 'address_search', 'not_set'],
      default: 'not_set',
    },
    dateLostFound: {
      type: Date,
      required: true,
    },
    showContact: {
      type: Boolean,
      default: false,
    },
    contactNumber: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'resolved'],
      default: 'active',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

/**
 * Index: district, type, status
 */
lostFoundSchema.index({ district: 1, type: 1, status: 1 });

/**
 * Index: userId, createdAt (descending)
 */
lostFoundSchema.index({ userId: 1, createdAt: -1 });

/**
 * GeoJSON geospatial index for lost & found locations.
 */
lostFoundSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('LostFound', lostFoundSchema);
