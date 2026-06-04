const mongoose = require('mongoose');

/**
 * Emergency Contact schema for LocalGuard emergency numbers and contacts.
 * @type {import('mongoose').Schema}
 */
const emergencyContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'police',
        'hospital',
        'fire_service',
        'ambulance',
        'electricity',
        'gas',
        'ward_member',
        'other',
      ],
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
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    phones: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return v.length > 0;
        },
        message: 'At least one phone number is required',
      },
    },
    email: {
      type: String,
      default: '',
    },
    isNational: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

/**
 * Index: district, category
 */
emergencyContactSchema.index({ district: 1, category: 1 });

/**
 * Seed data for emergency contacts in Bangladesh.
 * Can be imported via admin API endpoint.
 */
const seedData = [
  {
    name: 'National Emergency',
    category: 'police',
    division: 'All',
    district: 'All',
    isNational: true,
    phones: ['999'],
    notes: 'National emergency number',
  },
  {
    name: 'Fire Service',
    category: 'fire_service',
    division: 'All',
    district: 'All',
    isNational: true,
    phones: ['16163'],
    notes: 'National fire service number',
  },
  {
    name: 'Ambulance (DGHS)',
    category: 'ambulance',
    division: 'All',
    district: 'All',
    isNational: true,
    phones: ['16767'],
    notes: 'Directorate General of Health Services ambulance',
  },
  {
    name: 'Dhaka Medical College Hospital',
    category: 'hospital',
    division: 'Dhaka',
    district: 'Dhaka',
    phones: ['02-55165088'],
    address: 'Dhaka Medical College, Dhaka',
    notes: 'Emergency department available 24/7',
  },
  {
    name: 'Chittagong Metropolitan Police',
    category: 'police',
    division: 'Chittagong',
    district: 'Chittagong',
    phones: ['031-630600'],
    address: 'Chittagong, Bangladesh',
    notes: 'Chittagong police headquarters',
  },
  {
    name: 'Chittagong Fire Service',
    category: 'fire_service',
    division: 'Chittagong',
    district: 'Chittagong',
    phones: ['031-714601'],
    address: 'Chittagong, Bangladesh',
    notes: 'Fire emergency services',
  },
  {
    name: 'DESCO (Electricity)',
    category: 'electricity',
    division: 'Dhaka',
    district: 'Dhaka',
    phones: ['16116'],
    notes: 'Dhaka Electricity Supply Company emergency',
  },
  {
    name: 'Titas Gas',
    category: 'gas',
    division: 'Dhaka',
    district: 'Dhaka',
    phones: ['16499'],
    notes: 'Gas emergency and complaints',
  },
];

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
module.exports.seedData = seedData;
