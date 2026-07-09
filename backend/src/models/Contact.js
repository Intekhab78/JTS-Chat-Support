import mongoose from "mongoose";

const phoneSchema = new mongoose.Schema({
  phone: { type: String, trim: true },
  label: { type: String, trim: true, default: "work" }
}, { _id: false });

const contactSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    displayName: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "", index: true },
    phones: [phoneSchema],
    whatsApp: { type: String, trim: true, default: "" },
    jobTitle: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    birthday: { type: Date, default: null },
    profileImage: { type: String, trim: true, default: "" },
    preferredLanguage: { type: String, trim: true, default: "en" },
    timezone: { type: String, trim: true, default: "UTC" },
    address: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    postalCode: { type: String, trim: true, default: "" },
    socialLinks: {
      linkedin: { type: String, trim: true, default: "" },
      twitter: { type: String, trim: true, default: "" },
      facebook: { type: String, trim: true, default: "" },
      github: { type: String, trim: true, default: "" }
    },
    tags: [{ type: String, trim: true }],
    notes: { type: String, trim: true, default: "" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    source: { type: String, default: "manual" },
    status: { type: String, default: "active" },
    customFields: { type: Map, of: String },
    emails: [{ type: String, lowercase: true, trim: true }],
    isPrimary: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

// Pre-save hook to populate displayName automatically if not provided
contactSchema.pre("save", function(next) {
  if (!this.displayName) {
    this.displayName = `${this.firstName} ${this.lastName}`.trim();
  }
  next();
});

export const Contact = mongoose.model("Contact", contactSchema);
