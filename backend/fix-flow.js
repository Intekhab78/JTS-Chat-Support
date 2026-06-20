import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb+srv://chatAI:bawsfL1sbUHjKTVt@cluster0.ehduwnn.mongodb.net/chat-support?retryWrites=true&w=majority');
  
  const Flow = mongoose.model('Flow', new mongoose.Schema({}, { strict: false, collection: 'flows' }));
  const flow = await Flow.findOne({ name: 'Master Support & Sales Flow' });
  
  if (flow && flow.nodes && flow.nodes.buy_form && flow.nodes.buy_form.fields) {
    const budgetField = flow.nodes.buy_form.fields.find(f => f.name === 'budget');
    if (budgetField) {
      budgetField.options = ["Under $1k", "$1k - $5k", "$5k - $10k", "$10k+"];
      
      await Flow.updateOne({ _id: flow._id }, { $set: { "nodes.buy_form.fields": flow.nodes.buy_form.fields } });
      console.log('Fixed Master Support & Sales Flow options!');
    }
  }

  process.exit(0);
}
run();
