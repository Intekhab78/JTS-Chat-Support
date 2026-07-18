import mongoose from 'mongoose';

const atlasUri = 'mongodb+srv://chatAI:bawsfL1sbUHjKTVt@cluster0.ehduwnn.mongodb.net/chat-support?retryWrites=true&w=majority';
const localUri = 'mongodb://127.0.0.1:27017/chat-support';

const websiteId = '69c2a29b587dc977e619d212'; // Uae Invoiceing
const managerId = '69be37a312b562258c78450e'; // mohit

const categoriesPerDepartment = {
  billing: [
    { name: 'Invoice Discrepancy', subcategories: ['wrong amount', 'incorrect details', 'tax error'] },
    { name: 'Payment Methods', subcategories: ['credit card', 'paypal', 'bank transfer'] },
    { name: 'Refund Requests', subcategories: ['double charge', 'cancelled service', 'accidental purchase'] },
    { name: 'Subscription Status', subcategories: ['upgrade', 'downgrade', 'cancellation'] },
    { name: 'Billing Disputes', subcategories: ['unauthorized charge', 'late fee issue'] }
  ],
  sales: [
    { name: 'Enterprise Inquiry', subcategories: ['request demo', 'custom pricing', 'security questionnaire'] },
    { name: 'Retail Sales', subcategories: ['discount code', 'product availability', 'bulk order'] },
    { name: 'Partner Programs', subcategories: ['affiliate', 'reseller info'] },
    { name: 'Quote Request', subcategories: ['new quote', 'modify quote'] },
    { name: 'Sales Pitch', subcategories: ['general pricing', 'brochure download'] }
  ],
  support: [
    { name: 'Technical Issue', subcategories: ['app crash', 'login failure', 'api error'] },
    { name: 'Bug Report', subcategories: ['ui glitch', 'data sync issue'] },
    { name: 'Feature Request', subcategories: ['integrations', 'custom widgets'] },
    { name: 'How-To / Setup', subcategories: ['installation', 'getting started'] },
    { name: 'Account Recovery', subcategories: ['reset password', '2fa lock'] }
  ],
  accounts: [
    { name: 'Account Creation', subcategories: ['register business', 'personal account'] },
    { name: 'Profile Settings', subcategories: ['change email', 'update phone'] },
    { name: 'Password Management', subcategories: ['reset password', 'change password'] },
    { name: 'Delete Account', subcategories: ['gdpr request', 'close account'] },
    { name: 'Business Verification', subcategories: ['kyc upload', 'domain verification'] }
  ],
  refunds: [
    { name: 'Refund Eligibility', subcategories: ['policy check', 'return window'] },
    { name: 'Processing Time', subcategories: ['bank delay', 'stripe timeline'] },
    { name: 'Cancelled Transactions', subcategories: ['failed payment refund', 'auth hold'] },
    { name: 'Exchange Request', subcategories: ['different size', 'alternative product'] },
    { name: 'Store Credit', subcategories: ['gift card conversion', 'discount voucher'] }
  ],
  marketing: [
    { name: 'Newsletter Subscription', subcategories: ['subscribe', 'unsubscribe'] },
    { name: 'Sponsorship Inquiry', subcategories: ['event sponsorship', 'brand partnership'] },
    { name: 'Feedback & Reviews', subcategories: ['submit testimonial', 'report feedback'] },
    { name: 'Press & Media', subcategories: ['media kit request', 'interview request'] },
    { name: 'Promo Campaigns', subcategories: ['coupon active status', 'loyalty points'] }
  ],
  operations: [
    { name: 'Platform Maintenance', subcategories: ['server status', 'maintenance window'] },
    { name: 'Delivery Schedules', subcategories: ['shipping speed', 'customs delay'] },
    { name: 'Inventory Management', subcategories: ['out of stock report', 'restock alert'] },
    { name: 'Quality Control', subcategories: ['damaged item', 'packaging feedback'] },
    { name: 'Supplier Relations', subcategories: ['new vendor onboarding', 'supplier portal'] }
  ],
  finance: [
    { name: 'Tax Documents', subcategories: ['w9 form', 'vat invoice'] },
    { name: 'Audit Inquiry', subcategories: ['transaction log', 'fiscal statement'] },
    { name: 'Bank Transfers', subcategories: ['wire instructions', 'ach details'] },
    { name: 'Expense Reports', subcategories: ['reimbursements', 'vendor invoice'] },
    { name: 'Currency Conversion', subcategories: ['usd pricing', 'local currency conversion'] }
  ],
  logistics: [
    { name: 'Shipment Tracking', subcategories: ['tracking link', 'lost parcel'] },
    { name: 'Return Shipments', subcategories: ['label print', 'pickup schedule'] },
    { name: 'Warehouse Status', subcategories: ['fulfillment status', 'packaging detail'] },
    { name: 'Customs & Duty', subcategories: ['duty fee estimate', 'customs clearance'] },
    { name: 'Address Update', subcategories: ['change delivery address', 'special delivery notes'] }
  ],
  legal: [
    { name: 'Terms of Service', subcategories: ['terms update', 'accept policies'] },
    { name: 'Privacy Policy', subcategories: ['data retention', 'opt out'] },
    { name: 'GDPR/CCPA Requests', subcategories: ['export personal data', 'delete personal data'] },
    { name: 'IP Infringement', subcategories: ['copyright claim', 'trademark query'] },
    { name: 'Contract Execution', subcategories: ['nda request', 'agreement signing'] }
  ],
  general: [
    { name: 'General Inquiry', subcategories: ['about us', 'contact hours'] },
    { name: 'Feedback', subcategories: ['suggestions', 'complaints'] },
    { name: 'Careers', subcategories: ['open positions', 'internship'] },
    { name: 'Office Location', subcategories: ['directions', 'hours'] },
    { name: 'Website Feedback', subcategories: ['broken link', 'typo report'] }
  ]
};

async function insertData(uri, dbName) {
  console.log(`\n=== Inserting categories into ${dbName} ===`);
  const conn = await mongoose.createConnection(uri).asPromise();
  const db = conn.db;
  const col = db.collection('categories');

  // Clear existing categories for this website
  console.log('Clearing existing categories for this website to avoid duplicate key errors...');
  await col.deleteMany({ websiteId: new mongoose.Types.ObjectId(websiteId) });

  const docs = [];
  const now = new Date();

  Object.entries(categoriesPerDepartment).forEach(([deptName, cats]) => {
    cats.forEach(cat => {
      docs.push({
        websiteId: new mongoose.Types.ObjectId(websiteId),
        managerId: new mongoose.Types.ObjectId(managerId),
        department: deptName,
        name: cat.name,
        subcategories: cat.subcategories,
        createdAt: now,
        updatedAt: now
      });
    });
  });

  const result = await col.insertMany(docs);
  console.log(`Successfully inserted ${result.insertedCount} categories!`);

  // Verify total count
  const count = await col.countDocuments({ websiteId: new mongoose.Types.ObjectId(websiteId) });
  console.log(`Verified total categories in DB for website: ${count}`);

  await conn.close();
}

async function run() {
  try {
    await insertData(localUri, 'LOCAL DB');
  } catch (err) {
    console.error('Error inserting local DB:', err);
  }

  try {
    await insertData(atlasUri, 'ATLAS DB');
  } catch (err) {
    console.error('Error inserting Atlas DB:', err);
  }
}

run();
