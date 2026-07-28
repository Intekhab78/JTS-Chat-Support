import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://chat_support_user:Chat%402026%23Secure@127.0.0.1:27018/chat-support?authSource=chat-support";

await mongoose.connect(MONGODB_URI);
console.log("Connected to MongoDB.");

const websiteSchema = new mongoose.Schema({ websiteName: String }, { strict: false });
const taxMasterSchema = new mongoose.Schema({
  name: String,
  rate: Number,
  taxCode: String,
  description: String,
  websiteId: mongoose.Schema.Types.ObjectId,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Website = mongoose.models.Website || mongoose.model("Website", websiteSchema, "websites");
const TaxMaster = mongoose.models.TaxMaster || mongoose.model("TaxMaster", taxMasterSchema, "taxmasters");

const websites = await Website.find().lean();
console.log(`Found ${websites.length} websites.`);

const uaeVatSlabs = [
  { name: "Standard Rate (5% VAT)", rate: 5, taxCode: "VAT5", description: "UAE FTA Standard 5% VAT rate on taxable goods & services" },
  { name: "Zero Rated (0% VAT)", rate: 0, taxCode: "ZERO0", description: "Exports, healthcare, education, & international transport" },
  { name: "Exempt (0% VAT)", rate: 0, taxCode: "EXEMPT0", description: "Financial services, bare land, & residential buildings exempt" },
  { name: "Out of Scope (0% VAT)", rate: 0, taxCode: "OOS0", description: "Supplies outside the scope of UAE VAT law" },
  { name: "Reverse Charge Mechanism (5% VAT)", rate: 5, taxCode: "RCM5", description: "Imported goods & services under UAE RCM" }
];

for (const web of websites) {
  for (const vat of uaeVatSlabs) {
    const existing = await TaxMaster.findOne({ websiteId: web._id, name: vat.name });
    if (!existing) {
      await TaxMaster.create({ ...vat, websiteId: web._id });
      console.log(`Created ${vat.name} for website ${web.websiteName || web._id}`);
    }
  }
}

console.log("UAE VAT Master Seeding completed successfully.");
await mongoose.disconnect();
process.exit(0);
