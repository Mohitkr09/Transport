const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/* ======================================================
USER SCHEMA
====================================================== */

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name required"],
      trim: true,
      minlength: 2,
    },

    email: {
      type: String,
      required: [true, "Email required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"],
    },

    password: {
      type: String,
      required: [true, "Password required"],
      minlength: 6,
      select: false,
    },

    phone: {
      type: String,
      required: [true, "Phone required"],
      trim: true,
      match: [/^[0-9]{10,15}$/, "Invalid phone number"],
    },

    role: {
      type: String,
      enum: ["user", "driver", "admin"],
      default: "user",
    },

    avatar: {
      type: String,
      default: null,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },

    lastLocationUpdate: Date,

    isActive: {
      type: Boolean,
      default: true,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    lastLogin: Date,

    otp: {
      code: Number,
      expiresAt: Date,
    },

    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  {
    timestamps: true,
  }
);

/* ======================================================
INDEXES
====================================================== */

userSchema.index({ location: "2dsphere" });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 });

/* ======================================================
PASSWORD HASH (SAFE)
====================================================== */

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/* ======================================================
METHODS
====================================================== */

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.updateLocation = function (lat, lng) {
  if (lat == null || lng == null) return;

  this.location = {
    type: "Point",
    coordinates: [Number(lng), Number(lat)],
  };

  this.lastLocationUpdate = new Date();
};

userSchema.methods.setOTP = function (code) {
  this.otp = {
    code: Number(code),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  };
};

userSchema.methods.verifyOTP = function (input) {
  if (!this.otp) return false;

  const isValid =
    this.otp.code === Number(input) &&
    this.otp.expiresAt > new Date();

  if (isValid) this.otp = undefined;

  return isValid;
};

/* ======================================================
VIRTUALS
====================================================== */

userSchema.virtual("isOnline").get(function () {
  if (!this.lastLogin) return false;

  const diff = Date.now() - new Date(this.lastLogin).getTime();
  return diff < 5 * 60 * 1000;
});

/* ======================================================
JSON CLEANUP
====================================================== */

userSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.password;
    delete ret.__v;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    delete ret.otp;
    return ret;
  },
});

/* ======================================================
EXPORT
====================================================== */

module.exports = mongoose.model("User", userSchema);