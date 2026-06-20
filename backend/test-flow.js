import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb+srv://chatAI:bawsfL1sbUHjKTVt@cluster0.ehduwnn.mongodb.net/chat-support?retryWrites=true&w=majority');
  
  const Website = mongoose.model('Website', new mongoose.Schema({}, { strict: false, collection: 'websites' }));
  const websites = await Website.find();
  for (const w of websites) {
    if (w.botFlow) {
      if (w.botFlow.nodes?.buy_form?.fields) {
         console.log(w.websiteName, "BOTFLOW OPTIONS:", JSON.stringify(w.botFlow.nodes.buy_form.fields.find(f => f.name === 'budget')?.options));
      }
    }
  }

  const Flow = mongoose.model('Flow', new mongoose.Schema({}, { strict: false, collection: 'flows' }));
  const flows = await Flow.find();
  for (const f of flows) {
    if (f.nodes?.buy_form?.fields) {
       console.log(f.name, "FLOW OPTIONS:", JSON.stringify(f.nodes.buy_form.fields.find(f => f.name === 'budget')?.options));
    }
  }
  
  process.exit(0);
}
run();
