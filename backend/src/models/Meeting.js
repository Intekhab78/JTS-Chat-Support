import mongoose from "mongoose";

const meetingParticipantSchema = new mongoose.Schema({
  participantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  participantType: { type: String, enum: ["User", "Contact", "Customer"], required: true }
}, { _id: false });

const meetingSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    title: { type: String, required: true, trim: true },
    agenda: { type: String, trim: true, default: "" },
    participants: [meetingParticipantSchema],
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    location: { type: String, trim: true, default: "" },
    googleMeetUrl: { type: String, trim: true, default: "" },
    zoomUrl: { type: String, trim: true, default: "" },
    teamsUrl: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    outcome: { type: String, trim: true, default: "" },
    recordingUrl: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

export const Meeting = mongoose.model("Meeting", meetingSchema);
