import mongoose from 'mongoose';

const atlasUri = 'mongodb+srv://chatAI:bawsfL1sbUHjKTVt@cluster0.ehduwnn.mongodb.net/chat-support?retryWrites=true&w=majority';
const localUri = 'mongodb://127.0.0.1:27017/chat-support';

const websiteId = '69c2a29b587dc977e619d212'; // Uae Invoiceing

// List of 21 companies, contacts, and requirements to generate rich leads
const leadDataList = [
  // 1. Stage: NEW (3 records)
  {
    name: 'Rahul Khanna', email: 'r.khanna@innovatesolutions.in', phone: '+91 91234 56780',
    companyName: 'Innovate Solutions India', pipelineStage: 'new', recordType: 'lead', leadStatus: 'new',
    leadValue: 45000, budget: 50000, leadSource: 'website', requirement: 'Interested in implementing chat widget for consumer support.',
    industry: 'Technology', timeline: '1 month', priority: 'medium', interestLevel: 'warm', productSku: 'PROD-CHAT-01'
  },
  {
    name: 'Jessica Miller', email: 'jessica@millermfg.com', phone: '+1 415 555 0101',
    companyName: 'Miller Manufacturing Corp', pipelineStage: 'new', recordType: 'lead', leadStatus: 'new',
    leadValue: 60000, budget: 75000, leadSource: 'referral', requirement: 'Wants integration with CRM pipeline and ticketing.',
    industry: 'Manufacturing', timeline: '2 months', priority: 'high', interestLevel: 'hot', productSku: 'PROD-CRM-02'
  },
  {
    name: 'Vikram Singh', email: 'vsingh@apexconsulting.co.in', phone: '+91 99887 76655',
    companyName: 'Apex Business Consulting', pipelineStage: 'new', recordType: 'lead', leadStatus: 'new',
    leadValue: 25000, budget: 30000, leadSource: 'chat', requirement: 'Exploring standard help desk and canned response widgets.',
    industry: 'Consulting', timeline: 'Immediate', priority: 'low', interestLevel: 'warm', productSku: 'PROD-WIDG-03'
  },

  // 2. Stage: CONTACTED (3 records)
  {
    name: 'Aisha Al-Mansoori', email: 'aisha.m@gulfcommerce.ae', phone: '+971 4 321 4321',
    companyName: 'Gulf E-Commerce Ventures', pipelineStage: 'contacted', recordType: 'lead', leadStatus: 'contacted',
    leadValue: 85000, budget: 100000, leadSource: 'website', requirement: 'Needs multi-language support (English and Arabic) live chat.',
    industry: 'Retail', timeline: '3 months', priority: 'high', interestLevel: 'hot', productSku: 'PROD-CHAT-01'
  },
  {
    name: 'Thomas Wright', email: 'twright@apexfintech.com', phone: '+44 20 7946 0958',
    companyName: 'Apex Fintech Group', pipelineStage: 'contacted', recordType: 'lead', leadStatus: 'contacted',
    leadValue: 120000, budget: 150000, leadSource: 'cold_outreach', requirement: 'Requires highly secure ticketing system with audit logs.',
    industry: 'Finance', timeline: '1 month', priority: 'high', interestLevel: 'hot', productSku: 'PROD-SEC-04'
  },
  {
    name: 'Preeti Sharma', email: 'preeti@eduworld.co.in', phone: '+91 93456 78901',
    companyName: 'EduWorld International', pipelineStage: 'contacted', recordType: 'lead', leadStatus: 'contacted',
    leadValue: 35000, budget: 40000, leadSource: 'social_media', requirement: 'Needs agent scheduling and canned replies for student inquiries.',
    industry: 'Education', timeline: '2 months', priority: 'medium', interestLevel: 'warm', productSku: 'PROD-CHAT-01'
  },

  // 3. Stage: QUALIFIED (3 records)
  {
    name: 'David Chen', email: 'd.chen@orientalshipping.com', phone: '+852 2810 2810',
    companyName: 'Oriental Shipping Ltd', pipelineStage: 'qualified', recordType: 'deal', leadStatus: 'qualified', dealStage: 'qualified',
    leadValue: 95000, budget: 110000, leadSource: 'website', requirement: 'Qualified lead for custom integrations and high-volume chats.',
    industry: 'Logistics', timeline: '1 month', priority: 'high', interestLevel: 'hot', productSku: 'PROD-CRM-02'
  },
  {
    name: 'Sophia Rossi', email: 'sophia@belladesigns.it', phone: '+39 02 8765432',
    companyName: 'Bella Design Studio', pipelineStage: 'qualified', recordType: 'deal', leadStatus: 'qualified', dealStage: 'qualified',
    leadValue: 40000, budget: 50000, leadSource: 'referral', requirement: 'Needs automated chat triggers based on user page tracking.',
    industry: 'Design', timeline: '2 months', priority: 'medium', interestLevel: 'warm', productSku: 'PROD-WIDG-03'
  },
  {
    name: 'Manish Patel', email: 'manish@symphonysolutions.in', phone: '+91 98980 12345',
    companyName: 'Symphony Software Solutions', pipelineStage: 'qualified', recordType: 'deal', leadStatus: 'qualified', dealStage: 'qualified',
    leadValue: 70000, budget: 80000, leadSource: 'chat', requirement: 'Needs SLA response alerts and ticket assignment rules.',
    industry: 'Technology', timeline: 'Immediate', priority: 'medium', interestLevel: 'hot', productSku: 'PROD-CRM-02'
  },

  // 4. Stage: PROPOSAL (3 records)
  {
    name: 'Michael O Connor', email: 'moconnor@eurotravels.ie', phone: '+353 1 496 0123',
    companyName: 'EuroTravels Agencies', pipelineStage: 'proposal', recordType: 'deal', leadStatus: 'qualified', dealStage: 'proposal',
    leadValue: 110000, budget: 120000, leadSource: 'website', requirement: 'Awaiting review of full workspace help desk and SLA module proposal.',
    industry: 'Hospitality', timeline: '1 month', priority: 'high', interestLevel: 'hot', productSku: 'PROD-SLA-99'
  },
  {
    name: 'Kshitiz Verma', email: 'k.verma@neoelectronics.com', phone: '+91 88776 65544',
    companyName: 'Neo Electronics India', pipelineStage: 'proposal', recordType: 'deal', leadStatus: 'qualified', dealStage: 'proposal',
    leadValue: 55000, budget: 60000, leadSource: 'chat', requirement: 'Proposal sent for ticketing and live chat widgets.',
    industry: 'Retail', timeline: '2 weeks', priority: 'medium', interestLevel: 'warm', productSku: 'PROD-CHAT-01'
  },
  {
    name: 'Linda Martinez', email: 'linda.m@healthnet.org', phone: '+1 202 555 0147',
    companyName: 'HealthNet Group', pipelineStage: 'proposal', recordType: 'deal', leadStatus: 'qualified', dealStage: 'proposal',
    leadValue: 150000, budget: 200000, leadSource: 'referral', requirement: 'Needs secure workspace, HIPAA audit compliance, and SLA logs.',
    industry: 'Healthcare', timeline: '3 months', priority: 'high', interestLevel: 'hot', productSku: 'PROD-SEC-04'
  },

  // 5. Stage: NEGOTIATION (3 records)
  {
    name: 'Yuki Tanaka', email: 'y.tanaka@tokyoindustries.jp', phone: '+81 3 5555 0199',
    companyName: 'Tokyo Heavy Industries Ltd', pipelineStage: 'negotiation', recordType: 'deal', leadStatus: 'qualified', dealStage: 'negotiation',
    leadValue: 220000, budget: 250000, leadSource: 'website', requirement: 'Finalizing pricing terms for enterprise license with customized security SLA.',
    industry: 'Manufacturing', timeline: 'Immediate', priority: 'high', interestLevel: 'hot', productSku: 'PROD-SLA-99'
  },
  {
    name: 'Rajesh Gupta', email: 'rgupta@guptasteels.co.in', phone: '+91 97766 55443',
    companyName: 'Gupta Steel Traders', pipelineStage: 'negotiation', recordType: 'deal', leadStatus: 'qualified', dealStage: 'negotiation',
    leadValue: 65000, budget: 70000, leadSource: 'cold_outreach', requirement: 'Negotiating payment terms and custom SLA dashboard delivery.',
    industry: 'Construction', timeline: '1 week', priority: 'medium', interestLevel: 'warm', productSku: 'PROD-CRM-02'
  },
  {
    name: 'Chloe Dubois', email: 'chloe@fashionhub.fr', phone: '+33 1 4227 7890',
    companyName: 'FashionHub Retail Europe', pipelineStage: 'negotiation', recordType: 'deal', leadStatus: 'qualified', dealStage: 'negotiation',
    leadValue: 90000, budget: 100000, leadSource: 'website', requirement: 'Final discount request for multi-domain support dashboard setup.',
    industry: 'Retail', timeline: '2 weeks', priority: 'medium', interestLevel: 'hot', productSku: 'PROD-CHAT-01'
  },

  // 6. Stage: WON (3 records)
  {
    name: 'Anil Ambani', email: 'anil@reliancegroup.in', phone: '+91 22 2282 2282',
    companyName: 'Reliance Digital Systems', pipelineStage: 'won', recordType: 'customer', leadStatus: 'qualified', dealStage: 'won',
    leadValue: 300000, budget: 350000, leadSource: 'referral', requirement: 'Deal Closed. SLA and workspace fully active.',
    industry: 'Telecommunications', timeline: 'Immediate', priority: 'high', interestLevel: 'hot', productSku: 'PROD-SLA-99'
  },
  {
    name: 'Elizabeth Smith', email: 'e.smith@hudsonfinance.com', phone: '+1 212 555 0188',
    companyName: 'Hudson Finance Group', pipelineStage: 'won', recordType: 'customer', leadStatus: 'qualified', dealStage: 'won',
    leadValue: 140000, budget: 150000, leadSource: 'website', requirement: 'Billing setup completed. Enterprise workspace fully set.',
    industry: 'Finance', timeline: 'Immediate', priority: 'high', interestLevel: 'hot', productSku: 'PROD-SEC-04'
  },
  {
    name: 'Devendra Joshi', email: 'djoshi@bharatheavy.co.in', phone: '+91 11 2678 9012',
    companyName: 'Bharat Heavy Engineering', pipelineStage: 'won', recordType: 'customer', leadStatus: 'qualified', dealStage: 'won',
    leadValue: 80000, budget: 90000, leadSource: 'website', requirement: 'Purchase order processed. Initial onboarding training underway.',
    industry: 'Manufacturing', timeline: 'Immediate', priority: 'medium', interestLevel: 'hot', productSku: 'PROD-CRM-02'
  },

  // 7. Stage: LOST (3 records)
  {
    name: 'Markus Weber', email: 'weber@berlinauto.de', phone: '+49 30 5555 0144',
    companyName: 'Berlin Automotive Group', pipelineStage: 'lost', recordType: 'deal', leadStatus: 'qualified', dealStage: 'lost',
    leadValue: 130000, budget: 110000, leadSource: 'cold_outreach', requirement: 'Lost due to competitor offering built-in AI chatbots at lower cost.',
    industry: 'Automotive', lostReason: 'competitor', timeline: 'Immediate', priority: 'medium', interestLevel: 'cold', productSku: 'PROD-CRM-02'
  },
  {
    name: 'Suresh Kumar', email: 'suresh@kumaronline.co.in', phone: '+91 94440 12345',
    companyName: 'Kumar E-Retail Services', pipelineStage: 'lost', recordType: 'deal', leadStatus: 'qualified', dealStage: 'lost',
    leadValue: 45000, budget: 35000, leadSource: 'social_media', requirement: 'Lost due to budget limit restrictions.',
    industry: 'Retail', lostReason: 'price_issue', timeline: '1 month', priority: 'low', interestLevel: 'cold', productSku: 'PROD-CHAT-01'
  },
  {
    name: 'Natalie Portman', email: 'natalie@hollywoodarts.org', phone: '+1 310 555 0165',
    companyName: 'Hollywood Arts Foundation', pipelineStage: 'lost', recordType: 'deal', leadStatus: 'qualified', dealStage: 'lost',
    leadValue: 75000, budget: 80000, leadSource: 'website', requirement: 'Prospect stopped responding to outreach after proposal was delivered.',
    industry: 'Media', lostReason: 'no_response', timeline: '2 months', priority: 'medium', interestLevel: 'cold', productSku: 'PROD-WIDG-03'
  }
];

async function seedCRM(uri, dbLabel) {
  console.log(`\n=== Seeding CRM for ${dbLabel} ===`);
  const conn = await mongoose.createConnection(uri).asPromise();
  const db = conn.db;

  const CustomerModel = conn.model('Customer', new mongoose.Schema({}, { strict: false }));
  const QuotationModel = conn.model('Quotation', new mongoose.Schema({}, { strict: false }));
  const CustomerSuccessModel = conn.model('CustomerSuccess', new mongoose.Schema({}, { strict: false }));
  const FollowUpTaskModel = conn.model('FollowUpTask', new mongoose.Schema({}, { strict: false }));
  const ProductModel = conn.model('Product', new mongoose.Schema({}, { strict: false }));
  const UserModel = conn.model('User', new mongoose.Schema({}, { strict: false }));

  // Find Sales User
  const salesUser = await UserModel.findOne({ email: 'sales.user@example.com' });
  if (!salesUser) {
    console.error(`  ❌ Sales User 'sales.user@example.com' not found! Make sure users are created first.`);
    await conn.close();
    return;
  }
  const ownerId = salesUser._id;

  // Ensure products exist
  const products = {
    'PROD-CHAT-01': await ProductModel.findOne({ sku: 'PROD-CHAT-01' }) || await ProductModel.create({
      name: 'Omnichannel Chat Widget Module', sku: 'PROD-CHAT-01', price: 20000, description: 'Live web chat widget with routing mechanics', category: 'software'
    }),
    'PROD-CRM-02': await ProductModel.findOne({ sku: 'PROD-CRM-02' }) || await ProductModel.create({
      name: 'Enterprise CRM Sync Integration', sku: 'PROD-CRM-02', price: 50000, description: 'Direct sync connector with Salesforce/Hubspot API', category: 'software'
    }),
    'PROD-WIDG-03': await ProductModel.findOne({ sku: 'PROD-WIDG-03' }) || await ProductModel.create({
      name: 'Custom Theme Automation Add-On', sku: 'PROD-WIDG-03', price: 15000, description: 'Styling engine and custom themes matching brand guidelines', category: 'software'
    }),
    'PROD-SEC-04': await ProductModel.findOne({ sku: 'PROD-SEC-04' }) || await ProductModel.create({
      name: 'Advanced Security and Log Auditing Pack', sku: 'PROD-SEC-04', price: 75000, description: 'Encrypted databases, 2FA enforcing, and tamper-proof logs', category: 'software'
    }),
    'PROD-SLA-99': await ProductModel.findOne({ sku: 'PROD-SLA-99' }) || await ProductModel.create({
      name: 'Dedicated SLA Support Agreement', sku: 'PROD-SLA-99', price: 100000, description: '24/7 dedicated telephone support SLA agreement', category: 'software'
    })
  };

  const emailsToClean = leadDataList.map(l => l.email);
  const existingCustomers = await CustomerModel.find({ email: { $in: emailsToClean }, websiteId: new mongoose.Types.ObjectId(websiteId) });
  const customerIdsToClean = existingCustomers.map(c => c._id);

  console.log(`  - Clearing existing CRM entries for Uae Invoiceing website...`);
  await CustomerModel.deleteMany({ email: { $in: emailsToClean }, websiteId: new mongoose.Types.ObjectId(websiteId) });
  await CustomerSuccessModel.deleteMany({ customerId: { $in: customerIdsToClean } });
  await QuotationModel.deleteMany({ customerId: { $in: customerIdsToClean } });
  await FollowUpTaskModel.deleteMany({ customerId: { $in: customerIdsToClean } });

  const now = new Date();
  let createdCount = 0;

  for (let i = 0; i < leadDataList.length; i++) {
    const data = leadDataList[i];
    const crn = `CRN-${now.getFullYear()}-${String(i + 1).padStart(5, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    const lastInteractionDate = new Date();
    lastInteractionDate.setDate(lastInteractionDate.getDate() - Math.floor(Math.random() * 10));

    // Create Customer/Lead
    const customer = await CustomerModel.create({
      crn,
      name: data.name,
      email: data.email,
      phone: data.phone,
      companyName: data.companyName,
      recordType: data.recordType,
      leadStatus: data.leadStatus,
      dealStage: data.dealStage || null,
      pipelineStage: data.pipelineStage,
      leadSource: data.leadSource,
      leadValue: data.leadValue,
      budget: data.budget,
      requirement: data.requirement,
      territory: 'Middle East',
      industry: data.industry,
      timeline: data.timeline,
      priority: data.priority,
      interestLevel: data.interestLevel,
      lostReason: data.lostReason || '',
      websiteId: new mongoose.Types.ObjectId(websiteId),
      ownerId,
      ownerAssignedAt: now,
      firstInteraction: lastInteractionDate,
      lastInteraction: lastInteractionDate,
      lastActivity: now,
      isActive: true,
      createdAt: lastInteractionDate,
      updatedAt: now,
      internalNotes: [
        {
          type: 'note',
          text: `Initialized lead record for ${data.name}. Set primary department requirement to ${data.pipelineStage === 'new' ? 'Unassigned' : 'Assigned'}.`,
          authorId: ownerId,
          authorName: 'Sales User',
          createdAt: lastInteractionDate
        }
      ]
    });

    createdCount++;

    // Create Onboarding (if Won customer)
    if (data.pipelineStage === 'won') {
      const isCompleted = data.name === 'Elizabeth Smith'; // hudson finance is completed, reliance/bharat in progress
      await CustomerSuccessModel.create({
        websiteId: new mongoose.Types.ObjectId(websiteId),
        customerId: customer._id,
        healthScore: isCompleted ? 95 : 82,
        onboardingStatus: isCompleted ? 'completed' : 'in_progress',
        onboardingChecklist: {
          workspaceCreated: true,
          adminInvited: true,
          usersAdded: isCompleted,
          dataImported: isCompleted,
          trainingCompleted: isCompleted,
          goLive: isCompleted
        },
        successManager: ownerId,
        createdAt: now,
        updatedAt: now
      });
    }

    // Create Quotation (if Deal stages)
    if (['qualified', 'proposal', 'negotiation', 'won', 'lost'].includes(data.pipelineStage)) {
      const product = products[data.productSku];
      const subtotal = data.leadValue;
      const tax = Math.round(subtotal * 0.18);
      const total = subtotal + tax;
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      await QuotationModel.create({
        quotationId: `QT-${now.getFullYear()}-${String(i + 100).padStart(4, '0')}-V1`,
        quotationNumber: `QT-${now.getFullYear()}-${String(i + 100).padStart(4, '0')}`,
        version: 1,
        customerId: customer._id,
        websiteId: new mongoose.Types.ObjectId(websiteId),
        ownerId,
        items: [{
          productId: product._id,
          description: product.description,
          quantity: 1,
          price: data.leadValue,
          taxRate: 18,
          taxAmount: tax,
          subtotal,
          total
        }],
        subtotal,
        tax,
        total,
        status: data.pipelineStage === 'won' ? 'accepted' : data.pipelineStage === 'lost' ? 'declined' : 'sent',
        approvalStatus: data.pipelineStage === 'won' ? 'approved' : 'none',
        validUntil,
        createdAt: lastInteractionDate,
        updatedAt: now
      });
    }

    // Create Follow-up Tasks (1 completed, 1 open)
    const taskOffset = data.pipelineStage === 'won' || data.pipelineStage === 'lost' ? -1 : 1;
    
    // Completed Task
    await FollowUpTaskModel.create({
      websiteId: new mongoose.Types.ObjectId(websiteId),
      customerId: customer._id,
      title: 'Initial contact and requirement gathering call',
      status: 'completed',
      dueAt: new Date(now.getTime() - 24 * 60 * 60 * 1000 * 2), // 2 days ago
      priority: 'medium',
      ownerId,
      createdAt: lastInteractionDate,
      updatedAt: now
    });

    // Open Task (if not Won/Lost, else just active onboarding follow-up)
    await FollowUpTaskModel.create({
      websiteId: new mongoose.Types.ObjectId(websiteId),
      customerId: customer._id,
      title: data.pipelineStage === 'won' ? 'Set up quarterly account health check' : data.pipelineStage === 'lost' ? 'Perform lost deal post-mortem audit' : 'Follow up on sent quote and negotiate contract',
      status: data.pipelineStage === 'won' || data.pipelineStage === 'lost' ? 'completed' : 'open',
      dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000 * taskOffset * 3), // 3 days offset
      priority: data.priority,
      ownerId,
      createdAt: lastInteractionDate,
      updatedAt: now
    });
  }

  console.log(`  ➕ Successfully generated ${createdCount} CRM Leads for Uae Invoiceing website.`);
  await conn.close();
}

async function run() {
  try {
    await seedCRM(localUri, 'LOCAL DB');
  } catch (err) {
    console.error('Error seeding local DB:', err);
  }

  try {
    await seedCRM(atlasUri, 'ATLAS DB');
  } catch (err) {
    console.error('Error seeding Atlas DB:', err);
  }
}

run();
