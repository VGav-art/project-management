const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  telephone_no: { type: String, required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  department: { type: String, required: true },
});

module.exports = mongoose.model("Employee", EmployeeSchema);
