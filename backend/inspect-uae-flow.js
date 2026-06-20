/**
 * inspect-uae-flow.js — Full inspection of the UAE Invoice active flow
 */
import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://chatAI:bawsfL1sbUHjKTVt@cluster0.ehduwnn.mongodb.net/chat-support?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(MONGO_URI);

  const Flow    = mongoose.model('Flow',    new mongoose.Schema({}, { strict: false, collection: 'flows'    }));
  const Website = mongoose.model('Website', new mongoose.Schema({}, { strict: false, collection: 'websites' }));

  // Get UAE Invoice website
  const uae = await Website.findOne({ websiteName: 'UAE Invoice' });
  if (!uae) { console.log('UAE Invoice website not found'); process.exit(1); }

  console.log('UAE Invoice website:');
  console.log('  _id:          ', uae._id.toString());
  console.log('  activeFlowId: ', uae.activeFlowId?.toString());
  console.log('  botEnabled:   ', uae.botEnabled);

  if (!uae.activeFlowId) { console.log('\n❌ No activeFlowId on website!'); process.exit(0); }

  const flow = await Flow.findById(uae.activeFlowId);
  if (!flow) { console.log('\n❌ Flow not found for id:', uae.activeFlowId); process.exit(0); }

  console.log('\n\nActive Flow:');
  console.log('  name:      ', flow.name);
  console.log('  _id:       ', flow._id.toString());
  console.log('  published: ', flow.isPublished);

  const nodes = flow.nodes || {};
  const nodeIds = Object.keys(nodes);
  const allIds = new Set(nodeIds);

  console.log(`\n  Total nodes: ${nodeIds.length}`);
  console.log('  Node IDs:', nodeIds.join(', '));

  console.log('\n\n=== FULL NODE DETAILS ===');
  for (const [id, node] of Object.entries(nodes)) {
    console.log(`\n[${id}]`);
    console.log('  type:    ', node.type);
    console.log('  message: ', node.message?.substring(0, 80));
    if (node.options && node.options.length > 0) {
      console.log('  options:');
      node.options.forEach(o => {
        const exists = allIds.has(o.next);
        console.log(`    "${o.text}" → "${o.next}" ${exists ? '✅' : '❌ MISSING'}`);
      });
    }
    if (node.next) {
      const exists = allIds.has(node.next);
      console.log(`  next: "${node.next}" ${exists ? '✅' : '❌ MISSING'}`);
    }
    if (node.isSolution) console.log('  isSolution: true');
    if (node.actionType) console.log('  actionType:', node.actionType);
  }

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
