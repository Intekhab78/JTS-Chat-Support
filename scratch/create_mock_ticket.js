const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/jts-chat-support');
  
  // Define schemas
  const Website = mongoose.model('Website', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Ticket = mongoose.model('Ticket', new mongoose.Schema({}, { strict: false }));

  let website = await Website.findOne();
  if (!website) {
    website = await Website.create({ websiteName: "Test Web", domain: "test.com", primaryColor: "#6366f1" });
  }

  let agent = await User.findOne({ role: 'agent' });
  if (!agent) {
    agent = await User.create({ name: "John Doe", email: "john@test.com", role: 'agent' });
  }

  const ticketId = 'TKT-TEST-SCROLL';
  await Ticket.deleteMany({ ticketId });
  await Ticket.create({
    ticketId,
    subject: "Need a beautiful website with lots of sections and updates to test scrolling",
    status: "open",
    priority: "medium",
    channel: "chat",
    website: website._id,
    agent: agent._id,
    createdAt: new Date(),
    updatedAt: new Date(),
    notes: [
      { content: "This is update 1 to make the page taller.", createdAt: new Date() },
      { content: "This is update 2 to make it even taller.", createdAt: new Date() },
      { content: "This is update 3 so that we have plenty of height.", createdAt: new Date() },
      { content: "This is update 4 to force scrolling.", createdAt: new Date() },
      { content: "This is update 5 to ensure overflow is triggered.", createdAt: new Date() },
      { content: "This is update 6 to double check everything.", createdAt: new Date() }
    ]
  });

  console.log('Created ticket:', ticketId);
  await mongoose.disconnect();
}

main().catch(console.error);
