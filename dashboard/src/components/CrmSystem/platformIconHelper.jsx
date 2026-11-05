import React from "react";
import {
  Video,
  Camera,
  Phone,
  Users,
  Handshake,
  Globe,
  Radio,
  Tv,
  Calendar,
  Laptop,
  Monitor,
  MessageSquare
} from "lucide-react";

export const PLATFORM_ICON_MAP = {
  Video,
  Camera,
  Phone,
  Users,
  Handshake,
  Globe,
  Radio,
  Tv,
  Calendar,
  Laptop,
  Monitor,
  MessageSquare,
  // Emoji & key backwards-compatibility fallbacks:
  "🎯": Video,
  "📹": Camera,
  "🎥": Video,
  "🟢": Globe,
  "🟣": Users,
  "📞": Phone,
  "🤝": Handshake,
  "💻": Laptop,
  "📡": Radio,
  jts_meet: Video,
  zoom: Camera,
  google_meet: Globe,
  ms_teams: Users,
  phone: Phone,
  in_person: Handshake,
};

export const PLATFORM_ICON_OPTIONS = [
  { id: "Video", label: "Video Call", Icon: Video },
  { id: "Camera", label: "Camera", Icon: Camera },
  { id: "Phone", label: "Phone", Icon: Phone },
  { id: "Users", label: "Team / Meeting", Icon: Users },
  { id: "Handshake", label: "In Person", Icon: Handshake },
  { id: "Globe", label: "Web / Global", Icon: Globe },
  { id: "Radio", label: "Broadcast", Icon: Radio },
  { id: "Tv", label: "Conference", Icon: Tv },
  { id: "Laptop", label: "Online", Icon: Laptop },
  { id: "Monitor", label: "Desktop", Icon: Monitor },
  { id: "Calendar", label: "Scheduled", Icon: Calendar },
  { id: "MessageSquare", label: "Chat / Messaging", Icon: MessageSquare },
];

export function renderPlatformIcon(iconKey, color = "#6366f1", size = 18, className = "") {
  const Component = PLATFORM_ICON_MAP[iconKey] || Video;
  return <Component size={size} style={{ color }} className={className} />;
}

