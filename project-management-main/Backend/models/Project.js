const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  description: { type: String, required: true, trim: true },
  contact_person: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
