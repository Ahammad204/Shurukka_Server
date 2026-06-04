const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User schema for LocalGuard authentication.
 * @type {import('mongoose').Schema}
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },
    division: { type: String, default: '' },
    district: { type: String, default: '' },
    upazila: { type: String, default: '' },
    role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
    reportCount: { type: Number, default: 0 },
    rejectedCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/**
 * Pre-save hook to hash the passwordHash field when modified.
 * Uses bcrypt with 12 salt rounds.
 */
userSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('passwordHash')) return next();

    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

/**
 * Compare a plain password against the stored passwordHash.
 * @param {string} plainPassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
