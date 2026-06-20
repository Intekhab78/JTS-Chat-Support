/**
 * repair-flow.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Diagnoses and repairs broken node links in the active flow for all websites.
 * Run with: node --experimental-vm-modules repair-flow.js
 * or:       node repair-flow.js (if package.json has "type":"module")
 *
 * What it does:
 *  1. Loads every Flow document from MongoDB
 *  2. Finds all options/next references pointing to missing nodes
 *  3. Creates sensible stub nodes for every missing target
 *  4. Saves the repaired flow back to the database
 *  5. Prints a full before/after report
 */

import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://chatAI:bawsfL1sbUHjKTVt@cluster0.ehduwnn.mongodb.net/chat-support?retryWrites=true&w=majority';

// ── Node stub templates keyed by common naming patterns ─────────────────────
function buildStubNode(nodeId, fromNode, optionText) {
  // Derive a sensible message and behaviour from the nodeId / option text
  const id = nodeId.toLowerCase();

  // Sales / inquiry related
  if (id.includes('sales') || id.includes('sale')) {
    return {
      type: 'form',
      message: "We'd love to learn about your project! Please share your details.",
      fields: [
        { name: 'name',           type: 'text',  label: 'Full Name',        required: true  },
        { name: 'email',          type: 'email', label: 'Email Address',     required: true  },
        { name: 'phone',          type: 'text',  label: 'Phone Number',      required: true  },
        { name: 'service_interest', type: 'text', label: 'Service Interest', required: true  }
      ],
      next: `${nodeId}_action`
    };
  }

  // Billing related
  if (id.includes('billing') || id.includes('bill') || id.includes('payment') || id.includes('invoice')) {
    return {
      type: 'button_group',
      message: 'What billing assistance do you need?',
      options: [
        { text: 'Invoice Request',      next: `${nodeId}_escalate` },
        { text: 'Payment Failed',       next: `${nodeId}_escalate` },
        { text: 'Subscription Issues',  next: `${nodeId}_escalate` },
        { text: 'Refund Request',       next: `${nodeId}_escalate` }
      ]
    };
  }

  // Technical / support related
  if (id.includes('technical') || id.includes('tech') || id.includes('support') || id.includes('issue')) {
    return {
      type: 'button_group',
      message: 'What technical issue are you facing?',
      options: [
        { text: 'Login Issues',       next: `${nodeId}_login`  },
        { text: 'Performance Issues', next: `${nodeId}_perf`   },
        { text: 'API Issues',         next: `${nodeId}_api`    },
        { text: 'Other Issues',       next: `${nodeId}_other`  }
      ]
    };
  }

  // OTP / password related
  if (id.includes('otp') || id.includes('password') || id.includes('forgot')) {
    return {
      type: 'message',
      message: 'Please check your registered email / phone for the OTP. If you did not receive it, click "Resend OTP" on the login page.',
      options: [
        { text: 'Issue resolved',    next: `${nodeId}_solved`   },
        { text: 'Still not working', next: `${nodeId}_escalate` }
      ]
    };
  }

  // Invalid credentials related
  if (id.includes('invalid') || id.includes('cred') || id.includes('login')) {
    return {
      type: 'message',
      message: 'Try resetting your password using the "Forgot Password" option on the login page.',
      options: [
        { text: 'Issue resolved',    next: `${nodeId}_solved`   },
        { text: 'Need more help',    next: `${nodeId}_escalate` }
      ]
    };
  }

  // Account related
  if (id.includes('account')) {
    return {
      type: 'button_group',
      message: 'What account issue are you experiencing?',
      options: [
        { text: 'Account locked',   next: `${nodeId}_escalate` },
        { text: 'Profile update',   next: `${nodeId}_escalate` },
        { text: 'Billing query',    next: `${nodeId}_escalate` }
      ]
    };
  }

  // Generic escalate / solved leaf nodes
  if (id.includes('escalate') || id.includes('agent')) {
    return {
      type: 'action',
      actionType: 'escalate',
      message: 'Connecting you to a support agent. Please wait...'
    };
  }

  if (id.includes('solved') || id.includes('success') || id.includes('done') || id.includes('complete')) {
    return {
      type: 'message',
      message: 'Great! Glad we could help. Is there anything else you need?',
      isSolution: true
    };
  }

  // Default: generic message + escalate option
  return {
    type: 'message',
    message: `Regarding "${optionText}" — our team will assist you shortly.`,
    options: [
      { text: 'Talk to an Agent', next: `${nodeId}_escalate` },
      { text: 'Go Back to Menu',  next: 'root' }
    ]
  };
}

// Build secondary stub nodes (e.g. _action, _escalate, _solved, _login, etc.)
function buildSecondaryStubs(primaryId, primaryNode) {
  const stubs = {};
  if (!primaryNode.options) return stubs;

  for (const opt of primaryNode.options) {
    const target = opt.next;
    if (!target) continue;
    // We'll create these later in a second pass if they're still missing
    if (target.endsWith('_escalate')) {
      stubs[target] = {
        type: 'action',
        actionType: 'escalate',
        message: 'Connecting you to the next available agent...'
      };
    } else if (target.endsWith('_solved')) {
      stubs[target] = {
        type: 'message',
        message: 'Wonderful! Glad we could help. Let us know if you need anything else.',
        isSolution: true
      };
    } else if (target.endsWith('_action')) {
      stubs[target] = {
        type: 'action',
        actionType: 'create_lead',
        next: target.replace('_action', '_success')
      };
      stubs[target.replace('_action', '_success')] = {
        type: 'message',
        message: 'Thank you! A team member will reach out to you shortly.',
        isSolution: true
      };
    } else if (target.endsWith('_login') || target.endsWith('_perf') || target.endsWith('_api') || target.endsWith('_other')) {
      stubs[target] = {
        type: 'message',
        message: `Our team will help you resolve this issue. Please describe your problem in detail.`,
        options: [
          { text: 'Issue resolved',    next: `${primaryId}_solved`   },
          { text: 'Need more help',    next: `${primaryId}_escalate` }
        ]
      };
    }
  }
  return stubs;
}

async function run() {
  console.log('\n🔧 Flow Repair Tool — JTS Chat Support');
  console.log('═'.repeat(60));
  
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  const Flow = mongoose.model('Flow', new mongoose.Schema({}, { strict: false, collection: 'flows' }));
  const flows = await Flow.find({});

  console.log(`📦 Found ${flows.length} flow(s) in database\n`);

  let totalFixed = 0;
  let totalErrors = 0;

  for (const flow of flows) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🌊 Flow: "${flow.name}" (${flow._id})`);
    console.log(`   Published: ${flow.isPublished}`);

    const nodes = flow.nodes || {};
    const allNodeIds = new Set(Object.keys(nodes));

    // ── Step 1: Find all broken references ──────────────────────────────────
    const brokenRefs = []; // { fromNode, optionText, missingTarget }

    for (const [id, node] of Object.entries(nodes)) {
      for (const opt of (node.options || [])) {
        if (opt.next && !allNodeIds.has(opt.next)) {
          brokenRefs.push({ fromNode: id, optionText: opt.text, missingTarget: opt.next });
        }
      }
      if (node.next && !allNodeIds.has(node.next)) {
        brokenRefs.push({ fromNode: id, optionText: 'next', missingTarget: node.next });
      }
    }

    if (brokenRefs.length === 0) {
      console.log('   ✅ No broken links found — flow is healthy');
      continue;
    }

    console.log(`\n   ❌ ${brokenRefs.length} broken link(s) detected:`);
    for (const ref of brokenRefs) {
      console.log(`      "${ref.fromNode}" → "${ref.optionText}" → missing node "${ref.missingTarget}"`);
    }
    totalErrors += brokenRefs.length;

    // ── Step 2: Build missing nodes ──────────────────────────────────────────
    const newNodes = {};
    const missingTargets = [...new Set(brokenRefs.map(r => r.missingTarget))];

    for (const missingId of missingTargets) {
      // Find the option text for this missing node
      const ref = brokenRefs.find(r => r.missingTarget === missingId);
      const stubNode = buildStubNode(missingId, ref.fromNode, ref.optionText);
      newNodes[missingId] = stubNode;
      console.log(`\n   🔨 Creating stub node "${missingId}" (type: ${stubNode.type})`);

      // Create secondary stubs (like _escalate, _solved, _action etc.)
      const secondaryStubs = buildSecondaryStubs(missingId, stubNode);
      for (const [secId, secNode] of Object.entries(secondaryStubs)) {
        if (!allNodeIds.has(secId) && !newNodes[secId]) {
          newNodes[secId] = secNode;
          console.log(`      ↳ Secondary stub: "${secId}" (type: ${secNode.type})`);
        }
      }
    }

    // ── Step 3: Merge new nodes into flow and save ───────────────────────────
    const mergedNodes = { ...nodes, ...newNodes };
    const $setPayload = {};
    for (const [id, node] of Object.entries(newNodes)) {
      $setPayload[`nodes.${id}`] = node;
    }

    await Flow.updateOne({ _id: flow._id }, { $set: $setPayload });

    const fixedCount = Object.keys(newNodes).length;
    totalFixed += fixedCount;
    console.log(`\n   ✅ Injected ${fixedCount} new node(s) into flow "${flow.name}"`);

    // ── Step 4: Re-validate after fix ────────────────────────────────────────
    const updatedFlow = await Flow.findById(flow._id);
    const updatedIds = new Set(Object.keys(updatedFlow.nodes || {}));
    const remainingBroken = [];
    for (const [id, node] of Object.entries(updatedFlow.nodes || {})) {
      for (const opt of (node.options || [])) {
        if (opt.next && !updatedIds.has(opt.next)) {
          remainingBroken.push(`"${id}" → "${opt.text}" → "${opt.next}"`);
        }
      }
    }

    if (remainingBroken.length === 0) {
      console.log(`   🎉 Flow "${flow.name}" is now fully valid! All links resolved.`);
    } else {
      console.log(`   ⚠️  ${remainingBroken.length} link(s) still unresolved (secondary stubs may need one more pass):`);
      for (const r of remainingBroken) console.log(`      ${r}`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 SUMMARY`);
  console.log(`   Broken links found:  ${totalErrors}`);
  console.log(`   Nodes created:       ${totalFixed}`);
  console.log(`   Flows processed:     ${flows.length}`);
  console.log('\n✅ Repair complete. Refresh the Flow Builder to see updated tree.\n');

  process.exit(0);
}

run().catch(err => {
  console.error('❌ Repair failed:', err);
  process.exit(1);
});
