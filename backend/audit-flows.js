/**
 * audit-flows.js — finds all flows + websites and maps broken links
 */
import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://chatAI:bawsfL1sbUHjKTVt@cluster0.ehduwnn.mongodb.net/chat-support?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  const Flow    = mongoose.model('Flow',    new mongoose.Schema({}, { strict: false, collection: 'flows'    }));
  const Website = mongoose.model('Website', new mongoose.Schema({}, { strict: false, collection: 'websites' }));

  // ── All flows ──────────────────────────────────────────────────────────────
  const flows = await Flow.find({});
  console.log(`=== ALL FLOWS (${flows.length}) ===`);
  for (const f of flows) {
    const nodeIds = Object.keys(f.nodes || {});
    const allIds  = new Set(nodeIds);
    const broken  = [];

    for (const [id, node] of Object.entries(f.nodes || {})) {
      for (const opt of (node.options || [])) {
        if (opt.next && !allIds.has(opt.next)) broken.push(`"${id}"→"${opt.text}"→"${opt.next}"`);
      }
      if (node.next && !allIds.has(node.next)) broken.push(`"${id}".next→"${node.next}"`);
    }

    console.log(`\nFlow: "${f.name}"`);
    console.log(`  _id:       ${f._id}`);
    console.log(`  Published: ${f.isPublished}`);
    console.log(`  Nodes (${nodeIds.length}): ${nodeIds.join(', ')}`);
    if (f.nodes?.root?.options) {
      console.log(`  root.options: ${(f.nodes.root.options).map(o => `${o.text}→${o.next}`).join(' | ')}`);
    }
    if (broken.length > 0) {
      console.log(`  ❌ BROKEN LINKS (${broken.length}):`);
      broken.forEach(b => console.log(`     ${b}`));
    } else {
      console.log(`  ✅ No broken links`);
    }
  }

  // ── All websites ────────────────────────────────────────────────────────────
  const websites = await Website.find({});
  console.log(`\n\n=== ALL WEBSITES (${websites.length}) ===`);
  for (const w of websites) {
    console.log(`\nWebsite: "${w.websiteName}"`);
    console.log(`  _id:          ${w._id}`);
    console.log(`  activeFlowId: ${w.activeFlowId}`);
    console.log(`  botEnabled:   ${w.botEnabled}`);
  }

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
