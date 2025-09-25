// Tasks.js (full component with SUB MODULE => Task Name mapping)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { Modal, Button } from 'react-bootstrap';
import './task.css';
import * as XLSX from 'xlsx';
import Layout from './Layout';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import Dropdown from "react-bootstrap/Dropdown";

// Utility: turn @employeeName into links inside description
const linkifyEmployeeNames = (html, employees) => {
  if (!html) return html;

  let result = html;

  employees.forEach(emp => {
    if (!emp?.name) return;

    // Match @Name exactly (case-insensitive, word boundary after)
    const regex = new RegExp(`@${emp.name}\\b`, "gi");

    const link = `<a href="/employee/${emp._id}" style="color:#6f42c1; text-decoration:underline;">@${emp.name}</a>`;
    result = result.replace(regex, link);
  });

  return result;
};

const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:8083';

const REQUIRED_HEADERS = [
  "MODULE NAME",
  "SUB MODULE",
  "PROCESS NAME",
  "PROCEDURE",
  "COMMENTS",
  "OWNER",
  "ASSIGNED DEV",
  "START DATE",
  "END DATE",
  "PRIORITY",
  "QA STATUS",
  "UAT STATUS",
  "REQUEST TYPE",
  "RESOLUTION TYPE (FUNCTIONAL OR TECHNICAL)",
];

function toISODate(v) {
  if (!v) return '';
  if (typeof v === 'number') {
    const date = XLSX.SSF.parse_date_code(v);
    if (!date) return '';
    const d = new Date(Date.UTC(date.y, (date.m || 1) - 1, date.d || 1));
    return d.toISOString().slice(0, 10);
  }
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  const parsed = new Date(v);
  if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
  return '';
}

// Expandable description component
function ExpandableDescription({ html, maxLength = 150 }) {
  const [expanded, setExpanded] = useState(false);

  if (!html) return <span className="text-muted">No description</span>;

  // Extract plain text to decide if it's too long
  const plainText = html.replace(/<[^>]+>/g, "");
  const tooLong = plainText.length > maxLength;

  // Truncate while keeping HTML
  const truncatedHtml = tooLong
    ? plainText.slice(0, maxLength) + "..."
    : plainText;

  return (
    <div className="task-description">
      <div
        className="description-content"
        dangerouslySetInnerHTML={{
          __html: expanded || !tooLong ? html : truncatedHtml,
        }}
      />
      {tooLong && (
        <button
          className="btn btn-link p-0 mt-1"
          style={{ color: "#9b6ddf", fontSize: "0.9rem" }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less ▲" : "Read more ▼"}
        </button>
      )}
    </div>
  );
}

export default function TaskTable() {
  const userRole = localStorage.getItem('userRole');

  // Data
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Filters & paging
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showAssigneeSearch, setShowAssigneeSearch] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");
const [assignedToMe, setAssignedToMe] = useState(false);
const [dueThisWeek, setDueThisWeek] = useState(false);
const [dateRange, setDateRange] = useState({ start: "", end: "" });


  // UI state
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Inline edit state (we treat editedTaskName as the SUB MODULE value)
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editedTaskName, setEditedTaskName] = useState(''); // will be sub_module
  const [editedTaskDescription, setEditedTaskDescription] = useState('');
  const [editedAssignedTo, setEditedAssignedTo] = useState('');
  const [editedTaskProject, setEditedTaskProject] = useState('');
  const [editedContactPerson, setEditedContactPerson] = useState('');
  const [editedStartDate, setEditedStartDate] = useState('');
  const [editedEndDate, setEditedEndDate] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [editedPriority, setEditedPriority] = useState("Medium");
  const [newStatus, setNewStatus] = useState("");
  const [editedStatus, setEditedStatus] = useState("");
  const [editedRequestType, setEditedRequestType] = useState('New Request');
  const [editedResolutionType, setEditedResolutionType] = useState('Functional');
  const [editedCategory, setEditedCategory] = useState("Task");
  const [editedProcedure, setEditedProcedure] = useState('');
const [editedComments, setEditedComments] = useState('');

  // New task state
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskProject, setNewTaskProject] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newRequestType, setNewRequestType] = useState('New Request');
  const [newResolutionType, setNewResolutionType] = useState('Functional');
  const [newCategory, setNewCategory] = useState("Task");
  const [newProcedure, setNewProcedure] = useState('');
const [newComments, setNewComments] = useState('');






const stripHtml = (html) => {
  if (!html) return "";

  // Replace <br> and <p> with newlines before stripping
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n");

  // Strip remaining tags
  const plain = withBreaks.replace(/<[^>]+>/g, "");

  // Clean up multiple newlines/spaces
  return plain.replace(/\n\s*\n/g, "\n").trim();
};


// normalize a status string to stable lowercase form: "not started", "in progress", etc.
const normalizeStatus = (s) =>
  (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, " "); // collapse underscores/spaces

// Map many possible DB/status strings to canonical buckets we use in filters/display
const canonicalStatus = (s, doneFlag = false) => {
  const n = normalizeStatus(s);

  if (doneFlag || n === "done" || n === "completed" || n === "closed") return "done";

  // Treat these as "work in progress"
  if (
    n === "in progress" ||
    n === "in review" ||
    n === "work in progress" ||
    n === "wip"
  ) {
    return "work in progress";
  }

  // Treat these as "not started"
  if (
    n === "not started" ||
    n === "to do" ||
    n === "todo" ||
    n === "idea" ||
    n === "notstarted"
  ) {
    return "not started";
  }

  // fallback: if unknown, categorize as not started
  return "not started";
};



//ticket state
const [showTicketsModal, setShowTicketsModal] = useState(false);
const [tickets, setTickets] = useState([]);

const fetchTickets = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/tickets`); // adjust endpoint
    setTickets(res.data.tickets || []);
  } catch (err) {
    console.error(err);
    setErrorMessage('Failed to fetch tickets.');
  }
};



  // Auto-clear flash messages
  useEffect(() => {
    if (!successMessage && !errorMessage) return;
    const t = setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 3000);
    return () => clearTimeout(t);
  }, [successMessage, errorMessage]);

  // Fetchers
  const fetchTasks = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/task`);
      const data = res.data.tasks || [];
      // normalize: ensure sub_module exists (some older records may not)
      const normalized = data.map((t) => ({
        ...t,
        _id: t._id || t.id,
        sub_module: t.sub_module || t.name || '',
      }));
      setTasks(normalized);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to fetch tasks.');
    }
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/projects`);
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to fetch projects.');
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/employee`);
      setEmployees(res.data.employees || []);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to fetch employees.');
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchEmployees();
  }, [fetchTasks]);
    // Compute filter counts
  const filterCounts = useMemo(() => {
    const counts = { all: tasks.length, done: 0, incomplete: 0, unassigned: 0 };

    tasks.forEach((t) => {
      const isDone = (t.status || "").toUpperCase() === "DONE" || t.done === true;
      const isIncomplete = !isDone;
      const isUnassigned = !t.assigned_to;

      if (isDone) counts.done += 1;
      if (isIncomplete) counts.incomplete += 1;
      if (isUnassigned) counts.unassigned += 1;
    });

    return counts;
  }, [tasks]);

  // Filtering & paging
const filteredTasks = useMemo(() => {
  let filtered = [...tasks];

  const currentUserId = localStorage.getItem('userId');
  const currentUserName = localStorage.getItem('userName') || '';

  // 1️⃣ Role-based access (non-admin sees only their tasks)
  if (userRole !== 'admin') {
    filtered = filtered.filter((t) => {
      const assignedEmp = employees.find(
        (e) => String(e._id) === String(t.assigned_to) || e.name === t.assigned_to
      );
      return (
        String(t.assigned_to) === String(currentUserId) ||
        assignedEmp?.name === currentUserName
      );
    });
  }

  // 2️⃣ Keep only tasks in visible projects
  const visibleProjectIds = new Set(
    userRole === 'admin'
      ? projects.map((p) => p._id)
      : projects
          .filter((p) => filtered.some((t) => t.project_key === p._id))
          .map((p) => p._id)
  );

  filtered = filtered.filter((t) => visibleProjectIds.has(t.project_key));

// 3️⃣ Status filter - using canonicalStatus helper
if (statusFilter) {
  const selected = normalizeStatus(statusFilter); // normalize whatever the UI set

  filtered = filtered.filter((t) => {
    const isDoneFlag = !!t.done;
    const actual = canonicalStatus(t.status, isDoneFlag); // "done" | "work in progress" | "not started"

    switch (selected) {
      case "done":
        return actual === "done";
      case "work in progress":
      case "in progress": // allow either label from UI if present
        return actual === "work in progress";
      case "not started":
      case "not started": // same
      case "todo":
      case "to do":
        return actual === "not started";
      case "incomplete":
        // "incomplete" = anything that's not done
        return actual !== "done";
      case "unassigned":
        return !t.assigned_to;
      default:
        return true;
    }
  });
}




  // 4️⃣ Search filter
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter((t) => {
      const project = projects.find((p) => p._id === t.project_key);
      const assignedEmp = employees.find(
        (e) => String(e._id) === String(t.assigned_to) || e.name === t.assigned_to
      );
      const contactPerson = employees.find(
        (e) => String(e._id) === String(t.contact_person) || e.name === t.contact_person
      );

      return (
        (t.sub_module || t.name || '').toLowerCase().includes(term) ||
        (t.description || '').toLowerCase().includes(term) ||
        (project?.name || '').toLowerCase().includes(term) ||
        (assignedEmp?.name || '').toLowerCase().includes(term) ||
        (contactPerson?.name || '').toLowerCase().includes(term)
      );
    });
  }

  // 5️⃣ Assignee filter
  
  if (selectedAssignee) {
    filtered = filtered.filter(
      (t) =>
        String(t.assigned_to) === String(selectedAssignee) ||
        String(t.assigned_to?._id) === String(selectedAssignee)
    );
  }

  // 6️⃣ "Assigned to me" filter
  if (assignedToMe) {
    filtered = filtered.filter(
      (t) =>
        String(t.assigned_to) === String(currentUserId) ||
        employees.find((e) => String(e._id) === String(t.assigned_to))?.name === currentUserName
    );
  }

  // 7️⃣ "Due this week" filter
  if (dueThisWeek) {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Sunday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    filtered = filtered.filter((t) => {
      if (!t.end_date) return false;
      const taskDate = new Date(t.end_date);
      return taskDate >= startOfWeek && taskDate <= endOfWeek;
    });
  }
  // 8️⃣ Date Range filter
if (dateRange.start || dateRange.end) {
  filtered = filtered.filter((t) => {
    if (!t.end_date) return false; // skip tasks without end_date
    const taskDate = new Date(t.end_date);

    const start = dateRange.start ? new Date(dateRange.start) : null;
    const end = dateRange.end ? new Date(dateRange.end) : null;

    if (start && taskDate < start) return false;
    if (end && taskDate > end) return false;

    return true;
  });
}

// 9️⃣ Priority filter
if (priorityFilter) {
  filtered = filtered.filter((t) => {
    const taskPriority = (t.priority || "").toLowerCase();
    return taskPriority === priorityFilter.toLowerCase();
  });
}




  return filtered;
}, [tasks, statusFilter, searchTerm, projects, employees, userRole, selectedAssignee, assignedToMe, dueThisWeek, dateRange,priorityFilter]);




  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTasks.slice(startIndex, startIndex + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTasks.length / pageSize) || 1;

  // Handlers (filter/search)
  const handleFilterSelect = (f) => {
    setStatusFilter(f);
    setCurrentPage(1);
  };
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // CRUD
  const handleSaveTask = async () => {
    if (!newTaskName || !newTaskDescription || !newTaskProject) {
      setErrorMessage('Task name, description, and project are required.');
      return;
    }
    setLoading(true);
    try {
      // set both name and sub_module to keep backend checks working and keep data consistent
      await axios.post(`${BASE_URL}/task`, {
        name: newTaskName,
        sub_module: newTaskName,
        description: linkifyEmployeeNames(newTaskDescription, employees),
        project_key: newTaskProject,
        assigned_to: newAssignedTo || null,
        contact_person: newContactPerson || null,
        start_date: newStartDate || null,
        end_date: newEndDate || null,
        priority: newPriority,
        status: newStatus,
        request_type: newRequestType,
        resolution_type: newResolutionType,
        category: newCategory,
          procedure: newProcedure,
  comments: newComments,
        done: false,
      });
      setSuccessMessage('Task added successfully!');
      setShowModal(false);
      setNewTaskName('');
      setNewTaskDescription('');
      setNewTaskProject('');
      setNewAssignedTo('');
      setNewContactPerson('');
      setNewStartDate('');
      setNewEndDate('');
      await fetchTasks();
    } catch (err) {
      console.error(err);
      setErrorMessage('Error saving task.');
    } finally {
      setLoading(false);
    }
  };

  // When editing, prefill inputs with sub_module -> editedTaskName and description -> editedTaskDescription
const handleEditTask = (task) => {
  const id = task._id || task.id;
  setEditingTaskId(id);
  setEditedTaskName(task.sub_module || task.name || '');
  setEditedTaskDescription(stripHtml(task.description || ''));
  setEditedAssignedTo(task.assigned_to || '');
  setEditedTaskProject(task.project_key || '');
  setEditedContactPerson(task.contact_person || '');
  setEditedStartDate((task.start_date || '').slice(0, 10));
  setEditedEndDate((task.end_date || '').slice(0, 10));
  setEditedPriority(task.priority || 'Medium');
  setEditedStatus(task.status || 'NOT STARTED');
  setEditedRequestType(task.request_type || 'New Request');
  setEditedResolutionType(task.resolution_type || 'Functional');
  setEditedCategory(task.category || 'Task');
  setEditedProcedure(stripHtml(task.procedure || ''));
  setEditedComments(stripHtml(task.comments || ''));
};


  const handleUpdateTask = async () => {
    if (!editedTaskName || !editedTaskDescription) {
      setErrorMessage("Task name and description are required.");
      return;
    }
    try {
      // send both name and sub_module so backend and other code stay consistent
      const payload = {
        name: editedTaskName,
        sub_module: editedTaskName,
        description: editedTaskDescription,
        project_key: editedTaskProject || null,
        assigned_to: editedAssignedTo || null,
        contact_person: editedContactPerson || null,
        start_date: editedStartDate || null,
        end_date: editedEndDate || null,
        priority: editedPriority,
        status: editedStatus,
        request_type: editedRequestType,
        resolution_type: editedResolutionType,
        category: editedCategory,
         procedure: editedProcedure,
  comments: editedComments,
        // keep done as current value (don't change here)
        done: tasks.find((t) => (t._id || t.id) === editingTaskId)?.done || false,
      };

      await axios.put(`${BASE_URL}/task/${editingTaskId}`, payload);

      setSuccessMessage("Task updated successfully!");
      setEditingTaskId(null);
      await fetchTasks();
    } catch (err) {
      console.error(err);
      setErrorMessage("Error updating task.");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await axios.delete(`${BASE_URL}/task/${taskId}`);
      setSuccessMessage('Task deleted!');
      await fetchTasks();
    } catch (err) {
      console.error(err);
      setErrorMessage('Error deleting task.');
    }
  };

  const handleCompleteTask = async (taskId) => {
    const idx = tasks.findIndex((t) => (t._id || t.id) === taskId);
    if (idx === -1) return;
    const copy = [...tasks];
    copy[idx].done = !copy[idx].done;
    setTasks(copy);
    try {
      await axios.put(`${BASE_URL}/task/${taskId}`, { done: copy[idx].done });
      setSuccessMessage('Task status updated.');
      await fetchTasks();
    } catch (err) {
      copy[idx].done = !copy[idx].done;
      setTasks(copy);
      console.error(err);
      setErrorMessage('Error updating task status.');
    }
  };

  // Pagination helpers
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };
  const visiblePages = useMemo(() => {
    const maxPagesToShow = 5;
    let start = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let end = Math.min(totalPages, start + maxPagesToShow - 1);
    if (end - start < maxPagesToShow - 1) start = Math.max(1, end - maxPagesToShow + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  // ===== Bulk Upload + Template =====
  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);

      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const headers = (rows[0] || []).map((h) => String(h).trim());

      // Validate required headers
      const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
      if (missing.length) {
        setLoading(false);
        setErrorMessage(
          `Missing columns: ${missing.join(', ')}. Please use the provided template.`
        );
        return;
      }

      // Optional: light row validation (dates)
      const rowsJson = XLSX.utils.sheet_to_json(ws); // objects by header
      const invalidRows = [];
      rowsJson.forEach((r, idx) => {
        const rn = idx + 2; // considering header row
        const start = toISODate(r['Start Date']);
        const end = toISODate(r['End Date']);
        if (r['Start Date'] && !start) invalidRows.push({ row: rn, error: 'Invalid Start Date' });
        if (r['End Date'] && !end) invalidRows.push({ row: rn, error: 'Invalid End Date' });
      });

      if (invalidRows.length) {
        const wsErr = XLSX.utils.json_to_sheet(invalidRows);
        const wbErr = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wbErr, wsErr, 'InvalidRows');
        XLSX.writeFile(wbErr, 'invalid_tasks.xlsx');
        setLoading(false);
        setErrorMessage('Some rows have invalid dates. An "invalid_tasks.xlsx" was downloaded.');
        return;
      }

      // Send to backend as FormData (server keeps parsing)
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${BASE_URL}/tasks/bulk`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccessMessage(res.data?.message || 'Bulk upload complete');

      if (res.data?.invalidRows?.length) {
        const ws2 = XLSX.utils.json_to_sheet(res.data.invalidRows);
        const wb2 = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb2, ws2, 'InvalidRows');
        XLSX.writeFile(wb2, 'invalid_tasks.xlsx');
        setErrorMessage(
          `Some rows failed: ${res.data.invalidRows
            .map((r) => `Row ${r.row} → ${r.error}`)
            .join('; ')}`
        );
      }

      setShowModal(false);
      await fetchTasks();
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Bulk upload failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const sample = [
      {
        "MODULE NAME": "Finance",
        "SUB MODULE": "Payments",
        "PROCESS NAME": "Invoice Processing",
        "PROCEDURE": "Step 1, Step 2...",
        "COMMENTS": "Urgent request",
        "OWNER": "John Doe",
        "ASSIGNED DEV": "Jane Smith",
        "START DATE": "2025-09-07",
        "END DATE": "2025-09-14",
        "PRIORITY": "High",
        "QA STATUS": "Pending",
        "UAT STATUS": "Not Started",
        "REQUEST TYPE": "New Request",
        "RESOLUTION TYPE (FUNCTIONAL OR TECHNICAL)": "Functional",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sample, { header: REQUIRED_HEADERS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    XLSX.writeFile(wb, 'tasks_template.xlsx');
  };

  return (
   <Layout>
  <div className="task-container" style={{ paddingTop: '10px' }}>
    {successMessage && <p className="text-success">{successMessage}</p>}
    {errorMessage && <p className="text-danger">{errorMessage}</p>}

    {userRole === 'admin' && (
      <>
        {/* 🔝 Top Controls */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-3 ms-2">
          
          {/* 🔎 Search + Filter + Rows */}
          <div className="d-flex flex-wrap align-items-center gap-3 flex-grow-1">
            {/* Search */}
            <input
              type="text"
              className="form-control"
              placeholder="Search list"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{ maxWidth: "250px" }}
            />

            {/* Filter Dropdown */}
            <Dropdown align="end">
              <Dropdown.Toggle variant="dark" id="filter-dropdown">
                Filter
              </Dropdown.Toggle>
              <Dropdown.Menu className="p-3" style={{ minWidth: "300px" }}>
                {/* ✅ Quick Filters */}
                <div className="d-flex flex-column gap-2 mb-3">
                  <button
                    className={`btn btn-outline-dark btn-sm text-start ${assignedToMe ? "active" : ""}`}
                    onClick={() => setAssignedToMe(!assignedToMe)}
                  >
                    <i className="bi bi-person-circle me-2"></i> Assigned to me
                  </button>

                  <button
                    className={`btn btn-outline-dark btn-sm text-start ${dueThisWeek ? "active" : ""}`}
                    onClick={() => setDueThisWeek(!dueThisWeek)}
                  >
                    <i className="bi bi-calendar-week me-2"></i> Due this week
                  </button>

                  <button
                    className={`btn btn-outline-dark btn-sm text-start ${statusFilter === "done" ? "active" : ""}`}
                    onClick={() => setStatusFilter(statusFilter === "done" ? "all" : "done")}
                  >
                    <i className="bi bi-check-circle me-2"></i> Done items
                  </button>
                </div>

                <hr />

                {/* 📅 Date Range */}
                <label className="text-muted small">Date range</label>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={dateRange.start}
                    onChange={(e) =>
                      setDateRange((prev) => ({ ...prev, start: e.target.value }))
                    }
                  />
                  <span>→</span>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={dateRange.end}
                    onChange={(e) =>
                      setDateRange((prev) => ({ ...prev, end: e.target.value }))
                    }
                  />
                </div>

                {/* 👤 Assignee Avatars */}
                <label className="text-muted small">Assignee</label>
                <div className="position-relative mb-3">
                  <div
                    className="d-flex flex-wrap gap-2"
                    style={{ maxHeight: "70px", overflow: "hidden" }}
                  >
                    {/* Reset option */}
                    <div
                      onClick={() => setSelectedAssignee("")}
                      title="All Assignees"
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: selectedAssignee === "" ? "#6f42c1" : "#444",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                      }}
                    >
                      *
                    </div>

                    {employees.map((emp) => (
                      <div
                        key={emp._id}
                        onClick={() => setSelectedAssignee(emp._id)}
                        title={emp.name}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          backgroundColor: selectedAssignee === emp._id ? "#6f42c1" : "#444",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                        }}
                      >
                        {emp.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    ))}
                  </div>

                  {/* Search more */}
                  <button
                    className="btn btn-outline-dark btn-sm mt-2 w-100"
                    onClick={() => setShowAssigneeSearch(!showAssigneeSearch)}
                  >
                    <i className="bi bi-search me-2"></i>
                    Search More
                  </button>

                  {showAssigneeSearch && (
                    <input
                      type="text"
                      placeholder="Search employees..."
                      className="form-control form-control-sm mt-2"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  )}
                </div>

                {/* 🔽 Priority Filter */}
                <label className="text-muted small">Priority</label>
                <div className="d-flex gap-2 mb-3">
                  {["highest", "high", "medium", "low"].map((level, idx) => (
                    <div
                      key={idx}
                      onClick={() =>
                        setPriorityFilter(priorityFilter === level ? "" : level)
                      }
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        backgroundColor: priorityFilter === level ? "#d9534f" : "#444",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      {idx === 0 ? "⇈" : idx === 1 ? "↑" : idx === 2 ? "=" : "↓"}
                    </div>
                  ))}
                </div>

                {/* 🔽 Status Filter */}
                <label className="text-muted small">Status</label>
                <div className="d-flex flex-wrap gap-2">
                  {["Done", "Work In Progress", "Not Started"].map(
                    (status) => (
                      <div
                        key={status}
                        onClick={() =>
                          setStatusFilter(statusFilter === status ? "" : status)
                        }
                        className={`px-2 py-1 rounded border ${
                          statusFilter === status
                            ? "bg-primary text-white"
                            : "bg-dark text-light"
                        }`}
                        style={{ fontSize: "0.75rem", cursor: "pointer" }}
                      >
                        {status}
                      </div>
                    )
                  )}
                </div>
              </Dropdown.Menu>
            </Dropdown>

            {/* Rows per page 
            <div className="d-flex align-items-center gap-2">
              <label className="mb-0">Rows:</label>
              <select
                className="form-select"
                style={{ width: "80px" }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
*/}
          </div>

          {/* Right side actions */}
          <div className="d-flex align-items-center gap-2">
            <Button
              style={{
                width: "150px",
                backgroundColor: "#6f42c1",
                borderColor: "#6f42c1",
                color: "#fff",
              }}
              onClick={() => setShowModal(true)}
            >
              <i className="bi bi-plus-circle me-2"></i> New Task
            </Button>

            <Button
              style={{
                width: "150px",
                backgroundColor: "#198754",
                borderColor: "#198754",
                color: "#fff",
              }}
              onClick={() => {
                fetchTickets();
                setShowTicketsModal(true);
              }}
            >
              <i className="bi bi-ticket-detailed me-2"></i> Show Tickets
            </Button>
          </div>
        </div>

        {/* 🔽 Status Quick Filters row */}
        <div className="d-flex flex-wrap gap-2 mt-3 ms-2">
          {["all", "done", "incomplete", "unassigned"].map((f) => (
            <button
              key={f}
              onClick={() => handleFilterSelect(f)}
              style={{
                color: statusFilter === f ? "#fff" : "#6f42c1",
                border: "1px solid #6f42c1",
                backgroundColor: statusFilter === f ? "#6f42c1" : "transparent",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "0.2s",
                fontWeight: statusFilter === f ? "bold" : "normal",
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({filterCounts[f]})
            </button>
          ))}
        </div>
      </>
    )}

        {/* Table */}
        <div className="table-container ">
          <div className="table-responsive">
            <table className="modern-table table table-striped align middle">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th style={{ width: '130px' }}>Project</th>
                  <th style={{ width: '150px' }}>Task Name</th>
                  <th style={{ width: '120px' }}>Category</th>
                  <th style={{ width: '250px' }}>Description</th>
                  <th style={{ width: '250px' }}>Procedure</th>
                  <th style={{ width: '250px' }}>Comments</th>
                  <th style={{ width: '130px' }}>Assigned To</th>
                  <th style={{ width: '130px' }}>Contact Person</th>
                  <th style={{ width: '100px' }}>Start Date</th>
                  <th style={{ width: '100px' }}>End Date</th>
                  <th style={{ width: '110px' }}>Request Type</th>
                  <th style={{ width: '110px' }}>Resolution Type</th>
                  <th style={{ width: '90px' }}>Priority</th>
                  <th style={{ width: '110px' }}>Status</th>
                  {userRole === 'admin' && <th style={{ width: '120px' }}>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {paginatedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={userRole === 'admin' ? 13 : 12} className="text-center py-4 text-muted">
                      No tasks available
                    </td>
                  </tr>
                ) : (
                  paginatedTasks.map((task, index) => {
                    const id = task._id || task.id;
                    const project = projects.find((p) => p._id === task.project_key);
                    const assignedEmp = employees.find(
                      (emp) => String(emp._id) === String(task.assigned_to) || String(emp.name) === String(task.assigned_to)
                    );
                    const contactPerson = employees.find(
                      (emp) => String(emp._id) === String(task.contact_person) || String(emp.name) === String(task.contact_person)
                    );

                    const start = task.start_date ? String(task.start_date).slice(0, 10) : '';
                    const end = task.end_date ? String(task.end_date).slice(0, 10) : '';

                    // displayTaskName prefers SUB MODULE
                    const displayTaskName = task.sub_module || task.name || 'Untitled';

                    return (
                      <tr key={id}>
                        <td>{(currentPage - 1) * pageSize + index + 1}</td>

                        {/* Project */}
                        <td>
                          {editingTaskId === id ? (
                            <select value={editedTaskProject} onChange={(e) => setEditedTaskProject(e.target.value)}>
                              <option value="">Select Project</option>
                              {projects.map((p) => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                              ))}
                            </select>
                          ) : (
                            project?.name || 'Unassigned'
                          )}
                        </td>

                        {/* Task Name - show SUB MODULE */}
                        <td>
                          {editingTaskId === id ? (
                            <input value={editedTaskName} onChange={(e) => setEditedTaskName(e.target.value)} />
                          ) : (
                            displayTaskName
                          )}
                        </td>

                        <td>
                          {editingTaskId === id ? (
                            <select value={editedCategory} onChange={(e) => setEditedCategory(e.target.value)}>
                              <option value="Task">Task</option>
                              <option value="Subtask">Subtask</option>
                            </select>
                          ) : (
                            task.category || "Task"
                          )}
                        </td>

     
{/* Description */}
<td className="description">
  {editingTaskId === id ? (
    <textarea
      value={editedTaskDescription}
      onChange={(e) => setEditedTaskDescription(e.target.value)}
      className="form-control"
      rows={3}
    />
  ) : (
    <span>{stripHtml(task.description)}</span>
  )}
</td>

{/* Procedure */}
<td className="description">
  {editingTaskId === id ? (
    <textarea
      value={editedProcedure}
      onChange={(e) => setEditedProcedure(e.target.value)}
      className="form-control"
      rows={3}
    />
  ) : (
    <span>{task.procedure ? stripHtml(task.procedure) : "No Procedure"}</span>
  )}
</td>

{/* Comments */}
<td className="description">
  {editingTaskId === id ? (
    <textarea
      value={editedComments}
      onChange={(e) => setEditedComments(e.target.value)}
      className="form-control"
      rows={3}
    />
  ) : (
    <span>{task.comments ? stripHtml(task.comments) : "No comments"}</span>
  )}
</td>



                        <td>
                          {editingTaskId === id ? (
                            <select value={editedAssignedTo} onChange={(e) => setEditedAssignedTo(e.target.value)}>
                              <option value="">Unassigned</option>
                              {employees.map((emp) => (
                                <option key={emp._id} value={emp._id}>{emp.name}</option>
                              ))}
                            </select>
                          ) : (
                            assignedEmp?.name || 'Unassigned'
                          )}
                        </td>

                        <td>
                          {editingTaskId === id ? (
                            <select value={editedContactPerson} onChange={(e) => setEditedContactPerson(e.target.value)}>
                              <option value="">Select</option>
                              {employees.map((emp) => (
                                <option key={emp._id} value={emp._id}>{emp.name}</option>
                              ))}
                            </select>
                          ) : (
                            contactPerson?.name || 'No Contact'
                          )}
                        </td>

                        <td>
                          {editingTaskId === id ? (
                            <input type="date" value={editedStartDate || ''} onChange={(e) => setEditedStartDate(e.target.value)} />
                          ) : (
                            start || '—'
                          )}
                        </td>

                        <td>
                          {editingTaskId === id ? (
                            <input type="date" value={editedEndDate || ''} onChange={(e) => setEditedEndDate(e.target.value)} />
                          ) : (
                            end || '—'
                          )}
                        </td>

                        <td>
                          {editingTaskId === id ? (
                            <select value={editedRequestType} onChange={(e) => setEditedRequestType(e.target.value)}>
                              <option value="Existing Request">Existing Request</option>
                              <option value="New Request">New Request</option>
                            </select>
                          ) : (
                            task.request_type || 'New Request'
                          )}
                        </td>

                        <td>
                          {editingTaskId === id ? (
                            <select value={editedResolutionType} onChange={(e) => setEditedResolutionType(e.target.value)}>
                              <option value="Functional">Functional</option>
                              <option value="Technical">Technical</option>
                            </select>
                          ) : (
                            task.resolution_type || 'Functional'
                          )}
                        </td>

                        <td>
                          {editingTaskId === id ? (
                            <select value={editedPriority} onChange={(e) => setEditedPriority(e.target.value)}>
                              <option value="Highest">🔺 Highest</option>
                              <option value="High">⬆️ High</option>
                              <option value="Medium">➖ Medium</option>
                              <option value="Low">⬇️ Low</option>
                              <option value="Lowest">🔻 Lowest</option>
                            </select>
                          ) : (
                            task.priority || 'Medium'
                          )}
                        </td>

                      <td>
  {editingTaskId === id ? (
    <select value={editedStatus} onChange={(e) => setEditedStatus(e.target.value)}>
  <option value="NOT STARTED">💡 Not Started</option>
  <option value="WORK IN PROGRESS">🚧 Work in Progress</option>
  <option value="DONE">✅ Done</option>
</select>

  ) : (
    (() => {
      const statusNormalized = (task.status || "").trim().toUpperCase();
      const isDone = statusNormalized === "DONE" || task.done === true;

      if (isDone) return "✅ Done";
      switch (statusNormalized) {
        case "NOT STARTED": return "💡 Not Started";
        case "TO DO": return "📝 To Do";
        case "IN PROGRESS": return "🚧 In Progress";
        case "IN REVIEW": return "🔍 In Review";
        default: return statusNormalized || "💡 Not Started"; // fallback
      }
    })()
  )}
</td>


                        {userRole === 'admin' && (
                          <td className="actions">
                            {editingTaskId === id ? (
                              <Button size="sm" onClick={handleUpdateTask}>💾 Save</Button>
                            ) : (
                              <div className="d-flex gap-2 justify-content-center">
                                <Button size="sm" onClick={() => handleEditTask(task)}>✏️ Edit</Button>
                                <Button size="sm" onClick={() => handleDeleteTask(id)}>🗑 Delete</Button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="d-flex justify-content-center align-items-center mt-4">
            <ul className="pagination pagination-modern mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={handlePrevPage}
                  style={{ color: "#6f42c1", borderColor: "#6f42c1" }}
                >
                  « Prev
                </button>
              </li>

              {visiblePages.map((page) => (
                <li key={page} className={`page-item ${page === currentPage ? 'active' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(page)}
                    style={{
                      color: page === currentPage ? "#fff" : "#6f42c1",
                      backgroundColor: page === currentPage ? "#6f42c1" : "transparent",
                      borderColor: "#6f42c1",
                    }}
                  >
                    {page}
                  </button>
                </li>
              ))}

              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={handleNextPage}
                  style={{ color: "#6f42c1", borderColor: "#6f42c1" }}
                >
                  Next »
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Add Task / Bulk Upload Modal */}
        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>New Task</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <input
              type="text"
              placeholder="Task Name"
              className="form-control mb-2"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
            />

           {/* Inline Description, Procedure, Comments */}
<div className="d-flex flex-wrap gap-2 mb-3">
  {/* Description */}
  <div style={{ flex: "1 1 32%", minWidth: "250px" }}>
    <label className="form-label fw-bold">Description</label>
   {} <ReactQuill
      value={newTaskDescription}
      onChange={setNewTaskDescription}
      className="form-control"
      style={{ height: "150px", overflowY: "auto" }}
      placeholder="Write a detailed task description..."
      modules={{
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean'],
        ],
      }}
    />
  </div>

  {/* Procedure */}
  <div style={{ flex: "1 1 32%", minWidth: "250px" }}>
    <label className="form-label fw-bold">Procedure</label>
    <ReactQuill
      value={newProcedure}
      onChange={setNewProcedure}
      className="form-control"
      style={{ height: "150px", overflowY: "auto" }}
      placeholder="Write step-by-step procedure..."
    />
  </div>

  {/* Comments */}
  <div style={{ flex: "1 1 32%", minWidth: "250px" }}>
    <label className="form-label fw-bold">Comments</label>
    <ReactQuill
      value={newComments}
      onChange={setNewComments}
      className="form-control"
      style={{ height: "150px", overflowY: "auto" }}
      placeholder="Add extra comments..."
    />
  </div>
</div>



            {/* Dates */}
            <div className="row g-2 mb-3">
              <div className="col-12 col-sm-6 col-md-6">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                />
              </div>
              <div className="col-12 col-sm-6 col-md-6">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Project + Assigned To + Contact Person side by side */}
            <div className="row g-2 mb-3">
              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label">Project</label>
                <select
                  className="form-select"
                  value={newTaskProject}
                  onChange={(e) => setNewTaskProject(e.target.value)}
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="Task">Task</option>
                  <option value="Subtask">Subtask</option>
                </select>
              </div>

              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label">Assign To</label>
                <select
                  className="form-select"
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}>
                  <option value="">Assign To</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label">Contact Person</label>
                <select
                  className="form-select"
                  value={newContactPerson}
                  onChange={(e) => setNewContactPerson(e.target.value)}>
                  <option value="">Select Contact Person</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Request Type + Resolution Type + Priority + Status in one line */}
            <div className="row g-2 mb-3">
              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label">Request Type</label>
                <select
                  className="form-select"
                  value={newRequestType}
                  onChange={(e) => setNewRequestType(e.target.value)}
                >
                  <option value="Existing Request">Existing Request</option>
                  <option value="New Request">New Request</option>
                </select>
              </div>

              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label">Resolution Type</label>
                <select
                  className="form-select"
                  value={newResolutionType}
                  onChange={(e) => setNewResolutionType(e.target.value)}
                >
                  <option value="Functional">Functional</option>
                  <option value="Technical">Technical</option>
                </select>
              </div>

              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label">Priority</label>
                <select
                  className="form-select"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                >
                  <option value="Highest">🔺 Highest</option>
                  <option value="High">⬆️ High</option>
                  <option value="Medium">➖ Medium</option>
                  <option value="Low">⬇️ Low</option>
                  <option value="Lowest">🔻 Lowest</option>
                </select>
              </div>

              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="NOT STARTED">💡 Not Started</option>
                  
                  <option value="WORK IN PROGRESS">🚧 Work In Progress</option>
                  
                  <option value="DONE">✅ Done</option>
                </select>
              </div>
            </div>

            {/* Bulk Upload */}
            <div className="mt-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label htmlFor="bulkUpload" className="form-label mb-0">
                  Upload Tasks (Excel)
                </label>
                <Button size="sm" variant="outline-primary" onClick={downloadTemplate}>
                  ⬇ Download Template
                </Button>
              </div>
              <input
                type="file"
                id="bulkUpload"
                accept=".xlsx, .xls"
                className="form-control"
                onChange={handleBulkUpload}
              />
              <small className="text-muted">
                Required columns: <strong>{REQUIRED_HEADERS.join(', ')}</strong>.
              </small>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={handleSaveTask} disabled={loading}>
              {loading ? 'Saving...' : 'Save Task'}
            </Button>
          </Modal.Footer>
        </Modal>
        {/* Tickets Modal */}
        <Modal show={showTicketsModal} onHide={() => setShowTicketsModal(false)} size="lg">
  <Modal.Header closeButton>
    <Modal.Title>Tickets</Modal.Title>
  </Modal.Header>
  <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
    {tickets.length === 0 ? (
      <p className="text-muted">No tickets available.</p>
    ) : (
      <table className="table table-striped">
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th>Description</th>
            <th>Priority</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket, idx) => (
            <tr key={ticket._id || idx}>
              <td>{idx + 1}</td>
              <td>{ticket.title}</td>
              <td>{ticket.description}</td>
              <td>{ticket.priority}</td>
              <td>{ticket.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowTicketsModal(false)}>
      Close
    </Button>
  </Modal.Footer>
</Modal>

      </div>
    </Layout>
  );
}
