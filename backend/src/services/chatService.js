import { logger } from "../utils/logger.js";
import { ChatSession } from "../models/ChatSession.js";
import { Message } from "../models/Message.js";
import { Visitor } from "../models/Visitor.js";
import { findAvailableAgent } from "./assignmentService.js";
import { generatePublicId } from "../utils/generateKey.js";
import { incrementActiveChats, incrementResolvedChats, incrementVisitors, updateAverageResponseTime } from "./analyticsService.js";
import { getOrCreateCustomer, findDefaultCrmOwner } from "./customerService.js";
import geoip from "geoip-lite";
import { UAParser } from "ua-parser-js";
import { getSocketServer } from "../sockets/index.js";
import { translateChatMessage } from "./translationService.js";

export async function registerVisitor({ 
  website, 
  visitorToken, 
  ipAddress, 
  deviceInfo, 
  name, 
  email,
  os: clientOs,
  browser: clientBrowser,
  device: clientDevice,
  city: clientCity,
  country: clientCountry,
  timezone: clientTimezone
}) {
  // Strip literal "undefined" / "null" strings that may come from the widget
  const cleanField = (val) => {
    if (!val) return null;
    const s = String(val).trim();
    return (s.toLowerCase() === "undefined" || s.toLowerCase() === "null" || s.toLowerCase() === "unknown" || s === "") ? null : s;
  };

  const cleanToken = cleanField(visitorToken);
  const cleanName = cleanField(name);
  const cleanEmail = cleanField(email);

  const visitorId = cleanToken || generatePublicId("visitor");
  const existing = await Visitor.findOne({ visitorId, websiteId: website._id });

  // Intelligent OS Detection
  let detectedOs = cleanField(clientOs);
  if (!detectedOs && deviceInfo) {
    if (/Windows 11/i.test(deviceInfo)) detectedOs = "Windows 11";
    else if (/Windows 10/i.test(deviceInfo)) detectedOs = "Windows 10";
    else if (/Windows/i.test(deviceInfo)) detectedOs = "Windows";
    else if (/Macintosh|Mac OS|macOS/i.test(deviceInfo)) detectedOs = "macOS";
    else if (/Android/i.test(deviceInfo)) detectedOs = "Android";
    else if (/iPhone|iPad|iOS/i.test(deviceInfo)) detectedOs = "iOS";
    else if (/Linux/i.test(deviceInfo)) detectedOs = "Linux";
  }
  if (!detectedOs) detectedOs = "Windows 10";

  // Intelligent Browser Detection
  let detectedBrowser = cleanField(clientBrowser);
  if (!detectedBrowser && deviceInfo) {
    if (/Edg/i.test(deviceInfo)) detectedBrowser = "Microsoft Edge";
    else if (/Chrome/i.test(deviceInfo)) detectedBrowser = "Chrome";
    else if (/Safari/i.test(deviceInfo)) detectedBrowser = "Safari";
    else if (/Firefox/i.test(deviceInfo)) detectedBrowser = "Firefox";
    else if (/Opera/i.test(deviceInfo)) detectedBrowser = "Opera";
  }
  if (!detectedBrowser) detectedBrowser = "Chrome";

  // Intelligent Device Detection
  let detectedDevice = cleanField(clientDevice);
  if (!detectedDevice) {
    if (/Android|iPhone|iOS|Mobile/i.test(detectedOs) || /mobile|android|iphone/i.test(deviceInfo || "")) {
      detectedDevice = "Mobile";
    } else if (/iPad|Tablet/i.test(deviceInfo || "")) {
      detectedDevice = "Tablet";
    } else {
      detectedDevice = "Desktop";
    }
  }

  // Intelligent Location Detection
  let detectedCity = cleanField(clientCity);
  let detectedCountry = cleanField(clientCountry);
  let detectedTimezone = cleanField(clientTimezone);

  if (!detectedCity || !detectedCountry) {
    if (ipAddress && ipAddress !== "::1" && ipAddress !== "127.0.0.1" && !ipAddress.startsWith("192.168.") && !ipAddress.startsWith("10.")) {
      try {
        const geo = geoip.lookup(ipAddress);
        if (geo) {
          if (!detectedCity && geo.city) detectedCity = geo.city;
          if (!detectedCountry && geo.country) detectedCountry = geo.country;
          if (!detectedTimezone && geo.timezone) detectedTimezone = geo.timezone;
        }
      } catch (e) {}
    }
  }

  // Timezone fallback if city or country still unknown
  if ((!detectedCountry || !detectedCity) && detectedTimezone) {
    if (detectedTimezone.includes("Kolkata") || detectedTimezone.includes("Calcutta") || detectedTimezone.includes("India")) {
      if (!detectedCountry) detectedCountry = "India";
      if (!detectedCity) detectedCity = "India";
    } else if (detectedTimezone.includes("Dubai") || detectedTimezone.includes("Abu_Dhabi")) {
      if (!detectedCountry) detectedCountry = "United Arab Emirates";
      if (!detectedCity) detectedCity = "Dubai";
    } else if (detectedTimezone.includes("New_York") || detectedTimezone.includes("Los_Angeles") || detectedTimezone.includes("Chicago")) {
      if (!detectedCountry) detectedCountry = "United States";
      if (!detectedCity) detectedCity = detectedTimezone.split("/")[1]?.replace(/_/g, " ");
    } else if (detectedTimezone.includes("/")) {
      const parts = detectedTimezone.split("/");
      if (!detectedCity) detectedCity = parts[parts.length - 1]?.replace(/_/g, " ");
      if (!detectedCountry) detectedCountry = parts[0];
    }
  }

  if (!detectedCountry) detectedCountry = "India";
  if (!detectedCity) detectedCity = "India";

  const finalDeviceInfo = `${detectedOs} • ${detectedBrowser}`;

  if (existing) {
    existing.lastVisitTime = new Date();
    existing.isOnline = true;
    existing.deviceInfo = finalDeviceInfo;
    existing.ipAddress = ipAddress || existing.ipAddress;
    if (cleanName) existing.name = cleanName;
    if (cleanEmail) existing.email = cleanEmail;
    existing.city = detectedCity;
    existing.country = detectedCountry;
    existing.timezone = detectedTimezone || existing.timezone || "Asia/Kolkata";
    existing.browser = detectedBrowser;
    existing.os = detectedOs;
    existing.device = detectedDevice;
    await existing.save();

    // If returning visitor now provides email/name and didn't have a CRN yet, upgrade their CRM record
    if (!existing.crn && (cleanName || cleanEmail)) {
      const customer = await getOrCreateCustomer({
        name: cleanName || existing.name,
        email: cleanEmail || existing.email,
        websiteId: website._id,
        visitorId: existing.visitorId
      });
      if (customer) {
        existing.customerId = customer._id;
        existing.crn = customer.crn;
        await existing.save();
      }
    }

    return { visitor: existing, isNew: false };
  }

  const visitor = await Visitor.create({
    visitorId,
    websiteId: website._id,
    ipAddress,
    deviceInfo: finalDeviceInfo,
    browser: detectedBrowser,
    os: detectedOs,
    device: detectedDevice,
    name: cleanName,
    email: cleanEmail,
    city: detectedCity,
    country: detectedCountry,
    timezone: detectedTimezone || "Asia/Kolkata",
    isOnline: true
  });

  // CRN Integration: Create/update Customer record for ALL visitors (identified or anonymous)
  const defaultOwnerId = await findDefaultCrmOwner({ websiteId: website._id, managerId: website.managerId });
  const customer = await getOrCreateCustomer({
    name: cleanName,
    email: cleanEmail,
    websiteId: website._id,
    visitorId: visitorId,
    leadSource: "Live Chat",
    ownerId: defaultOwnerId
  });
  if (customer) {
    visitor.customerId = customer._id;
    visitor.crn = customer.crn;
    await visitor.save();
  }

  await incrementVisitors(website._id);
  return { visitor, isNew: true };
}

export async function findOrCreateSession({ website, visitor, currentPage = "", sessionId = null }) {
  let session = null;

  if (sessionId) {
    session = await ChatSession.findOne({
      sessionId,
      websiteId: website._id,
      visitorId: visitor._id
    }).populate("assignedAgent", "name email isOnline");
  }

  if (!session) {
    session = await ChatSession.findOne({
      websiteId: website._id,
      visitorId: visitor._id,
      status: { $in: ["active", "queued"] }
    }).populate("assignedAgent", "name email isOnline");
  }

  if (session) {
    if (currentPage && session.currentPage !== currentPage) {
      if (!session.firstPage) session.firstPage = currentPage;
      session.visitHistory = Array.isArray(session.visitHistory) ? session.visitHistory : [];
      if (!session.visitHistory.includes(currentPage)) {
        session.visitHistory.push(currentPage);
      }
      session.currentPage = currentPage;
      await session.save();
    }
    return session;
  }

  const agent = await findAvailableAgent({ managerId: website.managerId, websiteId: website._id });
  const status = agent ? "active" : "queued";

  session = await ChatSession.create({
    sessionId: generatePublicId("session"),
    websiteId: website._id,
    visitorId: visitor._id,
    customerId: visitor.customerId || null,
    crn: visitor.crn || null,
    assignedAgent: agent?._id || null,
    status,
    currentPage,
    firstPage: currentPage,
    visitHistory: currentPage ? [currentPage] : []
  });

  await incrementActiveChats(website._id, 1);

  try {
    getSocketServer().emit("chat:started", {
      message: `New chat session started`,
      user: visitor.name || "Anonymous Visitor"
    });
  } catch (err) { }

  return ChatSession.findById(session._id).populate("assignedAgent", "name email isOnline");
}

export async function addMessage({ chatSession, sender, message, attachmentUrl = null, attachmentType = null, agentId = null, _id = null }) {
  try {
    if (!chatSession?._id) {
      console.error("[SERVICE_ERROR]: addMessage called without valid chatSession._id");
      throw new Error("Invalid session ID for message");
    }

    // Gracefully handle empty message if attachment exists to satisfy Mongoose validation
    const msgText = (message && message.trim()) ? message : (attachmentUrl ? "Sent an attachment" : "");

    // Fast-path translation defaults (0ms synchronous overhead)
    let translation = {
      translatedText: msgText,
      detectedLanguage: "en",
      detectedLanguageName: "English",
      flagSymbol: "🇬🇧"
    };

    const messageDoc = {
      sessionId: chatSession._id,
      sender,
      message: msgText,
      attachmentUrl,
      attachmentType,
      agentId: agentId || null,
      translatedText: msgText,
      detectedLanguage: "en",
      detectedLanguageName: "English",
      flagSymbol: "🇬🇧"
    };

    if (_id) {
      messageDoc._id = _id;
    }

    const savedMessage = await Message.create(messageDoc);

    // Asynchronously perform translation in background without blocking message delivery
    const hasNonAscii = /[^ -]/.test(msgText);
    if (hasNonAscii && msgText && msgText !== "Sent an attachment") {
      translateChatMessage({ text: msgText, targetLang: "en" })
        .then(t => {
          if (t && t.translatedText && t.translatedText !== msgText) {
            Message.findByIdAndUpdate(savedMessage._id, {
              translatedText: t.translatedText,
              detectedLanguage: t.detectedLanguage || "en",
              detectedLanguageName: t.detectedLanguageName || "English",
              flagSymbol: t.flagSymbol || "🌐"
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }

    logger.log(`[SERVICE_TRACE]: Message created successfully: ${savedMessage._id}`);

    // Update session with latest metadata for faster dashboard rendering
    const update = {
      $set: {
        lastMessageAt: savedMessage.createdAt,
        lastMessagePreview: msgText.length > 50 ? msgText.substring(0, 47) + "..." : msgText
      }
    };
    if (sender === "visitor") {
      update.$inc = { unreadCount: 1 };
    } else {
      update.$set.unreadCount = 0;
    }
    await ChatSession.findByIdAndUpdate(chatSession._id, update);

    return savedMessage;
  } catch (err) {
    console.error(`[SERVICE_FATAL]: Message creation failed:`, err);
    throw err;
  }
}

export async function closeSession(sessionId) {
  const session = await ChatSession.findById(sessionId);
  if (!session || session.status === "closed") {
    return session;
  }

  session.status = "closed";
  session.closedAt = new Date();
  await session.save();

  await incrementResolvedChats(session.websiteId);

  if (session.firstResponseAt) {
    const responseSeconds = Math.max(1, Math.round((session.firstResponseAt.getTime() - session.createdAt.getTime()) / 1000));
    await updateAverageResponseTime(session.websiteId, responseSeconds);
  }

  return session;
}
