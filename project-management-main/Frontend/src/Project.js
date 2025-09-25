import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import Layout from './Layout'; // import Layout.js
import './task.css';
import ReactQuill from "react-quill";
import 'react-quill/dist/quill.snow.css';


const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:8083';

const Dashboard = () => {
  const userRole = localStorage.getItem('userRole');

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [projectForm, setProjectForm] = useState({ name: '', description: '', contact_person: '' });

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', description: '', assigned_to: '', contact_person: '' });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editedTask, setEditedTask] = useState({ name: '', description: '', assigned_to: '', contact_person: '' });

  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const taskTableRef = useRef(null);

  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [modalDescription, setModalDescription] = useState('');

  const showModal = (task) => {
    setModalDescription(task.description || 'No description provided');
    setShowDescriptionModal(true);
  };

  const pageSize = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const [projectPage, setProjectPage] = useState(1);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [taskSearchTerm, setTaskSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const linkifyEmployeeNames = (text, employees) => {
  if (!text) return text;
  let result = text;
  employees.forEach(emp => {
    const regex = new RegExp(`\\b${emp.name}\\b`, "gi");
    result = result.replace(
      regex,
      `<a href="/employee/${emp._id || emp.id}" style="color:blue;text-decoration:underline;">${emp.name}</a>`
    );
  });
  return result;
};

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike", "blockquote", "code-block"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ color: [] }, { background: [] }],
    ["link", "image"],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "code-block",
  "list",
  "bullet",
  "color",
  "background",
  "link",
  "image",
];


  // -------------------- Fetch Data --------------------
  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/projects`);
      setProjects(Array.isArray(res.data.projects) ? res.data.projects : []);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to fetch projects.');
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/employee`);
      setEmployees(Array.isArray(res.data.employees) ? res.data.employees : []);
      return Array.isArray(res.data.employees) ? res.data.employees : [];
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to fetch employees.');
      return [];
    }
  }, []);

  const fetchTasks = useCallback(async (projectId, empList = employees) => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/task`, { params: { project_key: projectId } });
      const formattedTasks = (res.data.tasks || []).map(t => ({
        ...t,
        assigned_to: t.assigned_to ? empList.find(emp => (emp._id || emp.id) === t.assigned_to) : null,
        contact_person: t.contact_person ? empList.find(emp => (emp._id || emp.id) === t.contact_person) : null
      }));
      setTasks(formattedTasks);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to fetch tasks for this project.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [employees]);

  useEffect(() => {
    fetchProjects();
    fetchEmployees();
  }, [fetchProjects, fetchEmployees]);

  // -------------------- Project & Task Handlers --------------------
  const handleProjectClick = async (project) => {
    setSelectedProject(project);
    let empList = employees;
    if (employees.length === 0) empList = await fetchEmployees();
    fetchTasks(project._id || project.id, empList);
    setCurrentPage(1);
  };

  const handleOpenProjectModal = (project = null) => {
    if (project) {
      setEditingProjectId(project._id || project.id);
      setProjectForm({
        name: project.name,
        description: project.description,
        contact_person: project.contact_person?._id || project.contact_person || ''
      });
    } else {
      setEditingProjectId(null);
      setProjectForm({ name: '', description: '', contact_person: '' });
    }
    setShowProjectModal(true);
  };

const handleSaveProject = async () => {
  if (!projectForm.name || !projectForm.description || !projectForm.contact_person) {
    setErrorMessage('Please fill in all project fields.');
    return;
  }
  setLoading(true); setErrorMessage(''); setSuccessMessage('');
  try {
    let res;
    if (editingProjectId) {
      res = await axios.put(`${BASE_URL}/projects/${editingProjectId}`, projectForm);
      setSuccessMessage('Project updated successfully!');
    } else {
      res = await axios.post(`${BASE_URL}/projects`, projectForm);
      setSuccessMessage('Project added successfully!');
    }
    setShowProjectModal(false);
    await fetchProjects();
    setProjectForm({ name: '', description: '', contact_person: '' });
    setEditingProjectId(null);
  } catch (err) {
    console.error('Error saving project:', err);
    if (err.response) setErrorMessage(err.response.data.message || `Error ${err.response.status}: ${err.response.statusText}`);
    else if (err.request) setErrorMessage('No response from server. Check backend URL.');
    else setErrorMessage('Error saving project.');
  } finally { setLoading(false); }
};


  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project? Only projects with all tasks done can be deleted.")) return;
    setLoading(true); setErrorMessage(""); setSuccessMessage("");
    try {
      const res = await axios.get(`${BASE_URL}/task`, { params: { project_key: projectId } });
      const projectTasks = res.data.tasks || [];
      const incompleteTasks = projectTasks.filter(task => !task.done);
      if (incompleteTasks.length > 0) { setErrorMessage("Cannot delete project. All tasks must be done first."); setLoading(false); return; }
      await axios.delete(`${BASE_URL}/projects/${projectId}`);
      setSuccessMessage("Project and its tasks deleted successfully!");
      if (selectedProject?._id === projectId) { setSelectedProject(null); setTasks([]); }
      await fetchProjects();
    } catch (err) {
      console.error("Error deleting project:", err.response?.data || err.message || err);
      setErrorMessage("Error deleting project: " + (err.response?.data?.message || err.message));
    } finally { setLoading(false); }
  };

  const handleAddTask = async () => {
    if (!newTask.name || !newTask.description || !selectedProject) { setErrorMessage('Please fill in all task fields.'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/task`, { ...newTask, project_key: selectedProject._id || selectedProject.id, done: false });
      if (res.data.task) {
        fetchTasks(selectedProject._id || selectedProject.id, employees);
        setHighlightedTaskId(res.data.task._id || res.data.task.id);
        setTimeout(() => setHighlightedTaskId(null), 3000);
        taskTableRef.current?.scrollIntoView({ behavior: 'smooth' });
        setNewTask({ name: '', description: '', assigned_to: '', contact_person: '' });
        setShowTaskModal(false);
        setSuccessMessage('Task added successfully!');
      } else setErrorMessage('Failed to add task.');
    } catch (err) { console.error(err); setErrorMessage('Error adding task.'); } finally { setLoading(false); }
  };

  const handleEditTask = (task) => {
    setEditingTaskId(task._id || task.id);
    setEditedTask({
      name: task.name,
      description: task.description,
      assigned_to: task.assigned_to?._id || task.assigned_to || '',
      contact_person: task.contact_person?._id || task.contact_person || ''
    });
  };

  const handleUpdateTask = async () => {
    if (!editedTask.name || !editedTask.description) { setErrorMessage('Task name and description are required.'); return; }
    try {
      await axios.put(`${BASE_URL}/task/${editingTaskId}`, editedTask);
      fetchTasks(selectedProject._id || selectedProject.id, employees);
      setEditingTaskId(null);
      setSuccessMessage('Task updated successfully!');
    } catch (err) { console.error(err); setErrorMessage('Error updating task.'); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try { await axios.delete(`${BASE_URL}/task/${taskId}`); fetchTasks(selectedProject._id || selectedProject.id, employees); setSuccessMessage('Task deleted!'); }
    catch (err) { console.error(err); setErrorMessage('Error deleting task.'); }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const task = tasks.find(t => (t._id || t.id) === taskId); if (!task) return;
      const updateddone = !task.done;
      await axios.put(`${BASE_URL}/task/${taskId}`, { done: updateddone });
      setSuccessMessage('Task status updated.');
      await fetchTasks(selectedProject._id || selectedProject.id, employees);
    } catch (err) { console.error(err); setErrorMessage('Error updating task.'); }
  };

  // -------------------- Filter & Pagination --------------------
  const filteredTasks = useMemo(() => {
    let list = [...tasks];
    if (statusFilter !== 'all') list = list.filter(t => (t.done ? 'complete' : 'incomplete') === statusFilter);
    if (taskSearchTerm) list = list.filter(t => t.name.toLowerCase().includes(taskSearchTerm.toLowerCase()));
    return list;
  }, [tasks, statusFilter, taskSearchTerm]);
  const totalPages = Math.ceil(filteredTasks.length / pageSize);
  const currentTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const filteredProjects = useMemo(() => {
    let list = [...projects];
    if (projectSearchTerm) list = list.filter(p => p.name.toLowerCase().includes(projectSearchTerm.toLowerCase()));
    return list;
  }, [projects, projectSearchTerm]);
  const totalProjectPages = Math.ceil(filteredProjects.length / pageSize);
  const currentProjects = filteredProjects.slice((projectPage - 1) * pageSize, projectPage * pageSize);

  // -------------------- Render --------------------
  return (
    <Layout>
      <div className="p-3" style={{ backgroundColor: '#f2f7fb', minHeight: '100vh' }}>
        <h4>Projects & Tasks</h4>
        {errorMessage && <p className="text-danger">{errorMessage}</p>}
        {successMessage && <p className="text-success">{successMessage}</p>}
        {userRole === 'admin' && <Button className="btn btn-gradient mb-2" style={{ width: '150px' }}onClick={() => handleOpenProjectModal()}>
           <i className="bi bi-plus-circle me-2"></i> New Project</Button>}

        <div className="row mt-2">
          {/* Projects List */}
          <div className="col-md-4">
            <div className="card">
              <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <span>PROJECTS</span>
                <input type="text" placeholder="Search Projects" className="form-control form-control-sm" style={{ width: '60%' }} value={projectSearchTerm} onChange={e => setProjectSearchTerm(e.target.value)} />
              </div>
              <div className="card-body" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {currentProjects.length === 0 ? <p>No projects found</p> :
                  <ul className="list-group">
                    {currentProjects.map(p => {
                      const projectId = p._id || p.id;
                      const projectTasks = tasks.filter(t => (t.project_key === projectId));
                      const incompleteTasks = projectTasks.filter(t => !t.done);
                      return (
                        <li key={projectId} className={`list-group-item ${selectedProject?._id === projectId ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => handleProjectClick(p)}>
                          <strong>{p.name}</strong><br />
                          <small>{p.description}</small><br />
                          <strong className="text-muted">{p.contact_person?.name || 'N/A'}</strong><br />
                          {userRole === 'admin' && (
                            <div className="mt-2">
                              <Button
                                size="sm"
                                variant="warning"
                                className="me-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenProjectModal(p);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={incompleteTasks.length > 0} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(projectId);
                                }}
                                title={incompleteTasks.length > 0 ? "Cannot delete. Complete all tasks first." : ""}
                              >
                                Delete
                              </Button>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                }
                {totalProjectPages > 1 && (
                  <div className="d-flex justify-content-between mt-2">
                    <Button size="sm" disabled={projectPage === 1} onClick={() => setProjectPage(prev => prev - 1)}>Prev</Button>
                    <span>{projectPage}/{totalProjectPages}</span>
                    <Button size="sm" disabled={projectPage === totalProjectPages} onClick={() => setProjectPage(prev => prev + 1)}>Next</Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="col-md-8" ref={taskTableRef}>
            {selectedProject ? (
              <div className="card">
                <div className="card-header bg-secondary text-white d-flex justify-content-between">
                  <span>Tasks for {selectedProject.name}</span>
                  {userRole === 'admin' && <Button size="sm" onClick={() => setShowTaskModal(true)}>Add Task</Button>}
                </div>
                <div className="card-body">
                  {/* Search & Filter */}
                  <div className="d-flex gap-2 mb-2">
                    <input type="text" className="form-control" placeholder="Search Tasks" value={taskSearchTerm} onChange={e => setTaskSearchTerm(e.target.value)} />
                    <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                      <option value="all">All</option>
                      <option value="complete">Complete</option>
                      <option value="incomplete">Incomplete</option>
                    </select>
                  </div>

                  {/* Task Table */}
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Assigned To</th>
                        <th>Contact</th>
                        <th>Status</th>
                        {userRole === 'admin' && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentTasks.length === 0 && <tr><td colSpan="6">No tasks found.</td></tr>}
                      {currentTasks.map(task => {
                        const taskId = task._id || task.id;
                        const isEditing = editingTaskId === taskId;
                        const highlight = highlightedTaskId === taskId ? 'table-warning' : '';
                        return (
                          <tr key={taskId} className={highlight}>
                            <td>{isEditing ? <input className="form-control" value={editedTask.name} onChange={e => setEditedTask({ ...editedTask, name: e.target.value })} /> : task.name}</td>
                            <td>
                              {isEditing ? (
                                <ReactQuill
  theme="snow"
  value={editedTask.description}
  onChange={(content) =>
    setEditedTask({ ...editedTask, description: linkifyEmployeeNames(content, employees) })
  }
  modules={quillModules}
  formats={quillFormats}
/>

                              ) : (
                                <div
                                  style={{ cursor: 'pointer', color: 'black', whiteSpace: 'pre-wrap' }}
                                  onClick={() => showModal(task)}
                                  dangerouslySetInnerHTML={{
                                    __html:
                                      task.description && task.description.length > 50
                                        ? task.description.slice(0, 50) + "..."
                                        : task.description || "—",
                                  }}
                                />
                              )}
                            </td>
                            <td>{isEditing ? (
                              <select className="form-select" value={editedTask.assigned_to} onChange={e => setEditedTask({ ...editedTask, assigned_to: e.target.value })}>
                                <option value="">Select Employee</option>
                                {employees.map(emp => <option key={emp._id || emp.id} value={emp._id || emp.id}>{emp.name}</option>)}
                              </select>
                            ) : task.assigned_to?.name || 'N/A'}</td>
                            <td>{isEditing ? (
                              <select className="form-select" value={editedTask.contact_person} onChange={e => setEditedTask({ ...editedTask, contact_person: e.target.value })}>
                                <option value="">Select Contact</option>
                                {employees.map(emp => <option key={emp._id || emp.id} value={emp._id || emp.id}>{emp.name}</option>)}
                              </select>
                            ) : task.contact_person?.name || 'N/A'}</td>
                            <td><span className={`badge ${task.done ? 'bg-success' : 'bg-warning text-dark'}`}>{task.done ? 'Complete' : 'Incomplete'}</span></td>
                            {userRole === 'admin' && <td>
                              {isEditing ? (
                                <>
                                  <Button size="sm" onClick={handleUpdateTask}>Save</Button>
                                  <Button size="sm" variant="secondary" className="ms-1" onClick={() => setEditingTaskId(null)}>Cancel</Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="info" onClick={() => handleEditTask(task)}>Edit</Button>
                                  <Button size="sm" variant="danger" className="ms-1" onClick={() => handleDeleteTask(taskId)}>Delete</Button>
                                  <Button size="sm" variant={task.done ? 'warning' : 'success'} className="ms-1" onClick={() => handleCompleteTask(taskId)}>{task.done ? 'Undo' : 'Complete'}</Button>
                                </>
                              )}
                            </td>}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between mt-2">
                      <Button size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>Prev</Button>
                      <span>{currentPage}/{totalPages}</span>
                      <Button size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>Next</Button>
                    </div>
                  )}
                </div>
              </div>
            ) : <p>Select a project to view tasks.</p>}
          </div>
        </div>

     {/* -------------------- Project Modal --------------------*/}
<Modal show={showProjectModal} onHide={() => setShowProjectModal(false)}>
  <Modal.Header closeButton>
    <Modal.Title>{editingProjectId ? 'Edit Project' : 'Add Project'}</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <input
      type="text"
      placeholder="Project Name"
      className="form-control mb-2"
      value={projectForm.name}
      onChange={e => setProjectForm({ ...projectForm, name: e.target.value })}
    />
    <textarea
      placeholder="Description"
      className="form-control mb-2"
      value={projectForm.description}
      onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
    />
    <select
      className="form-select"
      value={projectForm.contact_person}
      onChange={e => setProjectForm({ ...projectForm, contact_person: e.target.value })}
    >
      <option value="">Select Contact Person</option>
      {employees.map(emp => (
        <option key={emp._id || emp.id} value={emp._id || emp.id}>
          {emp.name}
        </option>
      ))}
    </select>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowProjectModal(false)}>Cancel</Button>
    <Button variant="primary" onClick={handleSaveProject}>Save</Button>
  </Modal.Footer>
</Modal>


        {/* -------------------- Task Modal -------------------- */}
        <Modal show={showTaskModal} onHide={() => setShowTaskModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Add Task</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <input type="text" placeholder="Task Name" className="form-control mb-2" value={newTask.name} onChange={e => setNewTask({ ...newTask, name: e.target.value })} />
            <ReactQuill
  theme="snow"
  placeholder="Task Description"
  value={newTask.description}
  onChange={(content) =>
    setNewTask({ ...newTask, description: linkifyEmployeeNames(content, employees) })
  }
  modules={quillModules}
  formats={quillFormats}
/>

            <select className="form-select mb-2" value={newTask.assigned_to} onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })}>
              <option value="">Select Employee</option>
              {employees.map(emp => <option key={emp._id || emp.id} value={emp._id || emp.id}>{emp.name}</option>)}
            </select>
            <select className="form-select" value={newTask.contact_person} onChange={e => setNewTask({ ...newTask, contact_person: e.target.value })}>
              <option value="">Select Contact Person</option>
              {employees.map(emp => <option key={emp._id || emp.id} value={emp._id || emp.id}>{emp.name}</option>)}
            </select>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowTaskModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddTask}>Add</Button>
          </Modal.Footer>
        </Modal>

        {/* -------------------- Task Description Modal -------------------- */}
        <Modal show={showDescriptionModal} onHide={() => setShowDescriptionModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Task Description</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="task-description" dangerouslySetInnerHTML={{ __html: modalDescription }} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDescriptionModal(false)}>Close</Button>
          </Modal.Footer>
        </Modal>
      </div>
    </Layout>
  );
};

export default Dashboard;
