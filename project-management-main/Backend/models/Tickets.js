const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
  status: { type: String, enum: ["OPEN", "IN PROGRESS", "DONE", "ON HOLD"], default: "OPEN" },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  project_key: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Ticket", ticketSchema);
