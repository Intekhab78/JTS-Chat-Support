const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/jts-chat-support');
  const Ticket = mongoose.model('Ticket', new mongoose.Schema({ ticketId: String }));
  const tickets = await Ticket.find().limit(5);
  console.log('Tickets:', tickets.map(t => t.ticketId));
  await mongoose.disconnect();
}

main().catch(console.error);
