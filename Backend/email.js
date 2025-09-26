require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendTaskEmail = (assignedEmail, taskDetails) => {
  let emailSubject, emailMessage;
  const action = taskDetails.action;   // ✅ passed from routes

  // ------------------- NEW TASK -------------------
  if (action === 'assigned') {
    emailSubject = `New Task Assigned: ${taskDetails.taskName || "Untitled Task"}`;
    emailMessage = `
      <h3>You have been assigned a new task</h3>
      <p><strong>Task:</strong> ${taskDetails.taskName || "N/A"}</p>
      <p><strong>Contact Person:</strong> ${taskDetails.contactPerson || "N/A"}</p>
      <p>Please log in to the system to view more details regarding the task.</p>
      <p>Best regards,<br>Project Management Team</p>
    `;
  }

  // ------------------- BULK UPLOAD -------------------
  else if (action === 'upload') {
    // Ensure taskDetails.tasks is an array
    const tasksArray = Array.isArray(taskDetails.tasks) ? taskDetails.tasks : [];

    const taskList = tasksArray
      .map(task => `<li><strong>${task.name}</strong> (Project: ${task.project || "N/A"})</li>`)
      .join('');

    emailSubject = `New Tasks Uploaded`;
    emailMessage = `
      <h3>New Tasks Have Been Uploaded</h3>
      <p>You have been assigned new tasks. Please see the list below:</p>
      <ul>${taskList || "<li>No tasks found</li>"}</ul>
      <p>Please check the task management system for full details.</p>
      <p>Best regards,<br>Project Management Team</p>
    `;
  }

  // ------------------- TASK UPDATED -------------------
  else if (action === 'updated') {
    emailSubject = `Task Updated: ${taskDetails.updated?.name || "N/A"}`;
    emailMessage = `
      <h3>The task "${taskDetails.updated?.name || "N/A"}" has been updated</h3>
      <p><strong>Previous Details:</strong><br>
         Name: ${taskDetails.previous?.name || "N/A"}<br>
         Contact Person: ${taskDetails.previous?.contactPerson || "N/A"}</p>
      <p><strong>Updated Details:</strong><br>
         Name: ${taskDetails.updated?.name || "N/A"}<br>
         Contact Person: ${taskDetails.updated?.contactPerson || "N/A"}</p>
      <p>Please check the task management system for more details.</p>
      <p>Best regards,<br>Project Management Team</p>
    `;
  }

  // ------------------- DEFAULT -------------------
  else {
    emailSubject = "Task Notification";
    emailMessage = `
      <p>Hello,</p>
      <p>You have a task notification. Please check the system for details.</p>
      <p>Best regards,<br>Project Management Team</p>
    `;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: assignedEmail,
    subject: emailSubject,
    html: emailMessage
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('❌ Error sending email:', error);
    } else {
      console.log('✅ Email sent:', info.response);
    }
  });
};

module.exports = sendTaskEmail;
