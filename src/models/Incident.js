const mongoose = require('mongoose');

/**
 * Incident schema for LocalGuard crime/emergency reporting.
 * @type {import('mongoose').Schema}
 */
const incidentSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reporterName: {
      type: String,
      required: true,
    },
    anonymous: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'theft',
        'accident',
        'fire',
        'suspicious_activity',
        'power_gas',
        'flood_disaster',
        'medical_emergency',
        'other',
      ],
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100,
    },
    description: {
      type: String,
      required: true,
      minLength: 30,
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
    address: {
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
    incidentDate: {
      type: Date,
      required: true,
    },
    incidentTime: {
      type: String,
      required: true,
      match: /^\d{2}:\d{2}$/,
    },
    photos: {
      type: [String],
      default: [],
      validate: {
        validator: function (v) {
          return v.length <= 3;
        },
        message: 'Maximum 3 photos allowed',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'verified', 'rejected', 'archived'],
      default: 'pending',
    },
    flagCount: {
      type: Number,
      default: 0,
    },
    flaggedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

/**
 * Pre-save hook to set expiresAt to 30 days from now for verified incidents.
 */
incidentSchema.pre('save', function (next) {
  if (this.status === 'verified' && !this.expiresAt) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    this.expiresAt = thirtyDaysFromNow;
  }
  return next();
});

/**
 * Compound index: district, status, createdAt (descending).
 */
incidentSchema.index({ district: 1, status: 1, createdAt: -1 });

/**
 * Index: reporterId, createdAt (descending).
 */
incidentSchema.index({ reporterId: 1, createdAt: -1 });

/**
 * GeoJSON geospatial index for incident location.
 */
incidentSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Incident', incidentSchema);
