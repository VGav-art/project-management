// models/Task.js
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const TaskSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    project_key: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    contact_person: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },

 // Link to Ticket
    ticketId: { type: String, default: null }, // New field for ticket reference

    start_date: { type: Date },
    end_date: { type: Date },
      procedure: { type: String },  
      comments: { type: String },   
  qa_status: { type: String },      
  uat_status: { type: String },

    priority: { type: String, default: "Medium" },
    status: { type: String, default: "IDEA" },
    orderIndex: { type: Number, default: 0 },

    request_type: {
      type: String,
      enum: ["New Request", "Existing Request"],
      default: "New Request",
    },
    resolution_type: {
      type: String,
      enum: ["Functional", "Technical"],
      default: "Functional",
    },

    category: {
      type: String,
      enum: ["Task", "Subtask"], 
      default: "Task",
    },

    done: { type: Boolean, default: false },
    task_key: { type: String, unique: true, default: uuidv4 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", TaskSchema);
