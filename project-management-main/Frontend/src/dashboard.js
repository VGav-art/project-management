import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from './Layout';
import { Modal, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom'; // ✅ Added

function Dashboard() {
    const userRole = localStorage.getItem('userRole'); // 'admin' or 'employee'
  const currentUserId = localStorage.getItem('userId'); // employee _id
  const currentUserName = localStorage.getItem('userName');
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [incompleteCount, setIncompleteCount] = useState(0);
  const [projectCompletedCount, setProjectCompletedCount] = useState(0);
  const [projectIncompleteCount, setProjectIncompleteCount] = useState(0);
  const [projectTaskCount, setProjectTaskCount] = useState(0);
  const [projectEmployeeCount, setProjectEmployeeCount] = useState(0);
  const [completedEmployeesCount, setCompletedEmployeesCount] = useState(0);
  const [incompleteEmployeesCount, setIncompleteEmployeesCount] = useState(0);
  const [taskFilter, setTaskFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [modalDescription, setModalDescription] = useState('');

 const [allTasks, setAllTasks] = useState([]);

const fetchAllTasks = async () => {
  try {
    const res = await axios.get('http://localhost:8083/task');
    const fetchedTasks = Array.isArray(res.data) ? res.data : res.data.tasks || [];
    setAllTasks(fetchedTasks);
  } catch (err) {
    console.error('Error fetching all tasks:', err);
  }
};

useEffect(() => {
  fetchProjects();
  fetchEmployees();
  fetchCounts();
  fetchAllTasks(); // always fetch all tasks for filtering employee projects
}, []);

  useEffect(() => {
    if (allTasks.length > 0) {
      const completed = allTasks.filter(t => t.completed).length;
      const incomplete = allTasks.filter(t => !t.completed).length;
      setCompletedCount(completed);
      setIncompleteCount(incomplete);
    }
  }, [allTasks]);

  const fetchCounts = async () => {
    try {
      const taskRes = await axios.get('http://localhost:8083/task/count');
      setTaskCount(taskRes.data.count || 0);
    } catch (err) {
      console.error('Error fetching counts:', err);
    }
  };

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await axios.get('http://localhost:8083/projects');
      const fetchedProjects = Array.isArray(res.data) ? res.data : res.data.projects || [];
      setProjects(fetchedProjects);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get('http://localhost:8083/employee');
      const fetchedEmployees = Array.isArray(res.data) ? res.data : res.data.employees || [];
      setEmployees(fetchedEmployees);
      setEmployeeCount(fetchedEmployees.length);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setEmployees([]);
    }
  };

const fetchProjectTasks = async (projectId) => {
  setLoadingTasks(true);
  try {
    const res = await axios.get(`http://localhost:8083/task?projectId=${projectId}`);
    const fetchedTasks = Array.isArray(res.data) ? res.data : res.data.tasks || [];

    // Normalize completed based on status
 
const tasksWithIDs = fetchedTasks.map((task, index) => ({
  ...task,
  project_key: task.project_key || "uncategorized",
  continuousId: index + 1,
  completed: task.completed || (task.status && task.status.toString().toUpperCase() === "DONE"),
}));


    setTasks(tasksWithIDs);

    const completed = tasksWithIDs.filter(t => t.completed).length;
    setProjectCompletedCount(completed);
    setProjectIncompleteCount(tasksWithIDs.length - completed);
    setProjectTaskCount(tasksWithIDs.length);

    const employeeIds = [...new Set(tasksWithIDs.map(t => t.contact_person).filter(Boolean))];
    setProjectEmployeeCount(employeeIds.length);

    const completedEmp = employeeIds.filter(empId =>
      tasksWithIDs.filter(t => t.contact_person === empId).every(t => t.completed)
    );
    const incompleteEmp = employeeIds.filter(empId =>
      !tasksWithIDs.filter(t => t.contact_person === empId).every(t => t.completed)
    );
    setCompletedEmployeesCount(completedEmp.length);
    setIncompleteEmployeesCount(incompleteEmp.length);

  } catch (err) {
    console.error('Error fetching project tasks:', err);
    setTasks([]);
  } finally {
    setLoadingTasks(false);
  }
};


  const handleProjectClick = (project) => {
    const key = String(project.project_key || project._id);
    setSelectedProject(key);
    setActiveProject(key);
    setTaskFilter('all');
    setEmployeeFilter('project');
    setSelectedEmployee(null);
    fetchProjectTasks(key);
  };

  const handleEmployeeClick = (employeeId) => {
    setSelectedEmployee(employeeId);
    setEmployeeFilter('employee');
    setTaskFilter('all');
  };

  const resetView = () => {
    setSelectedProject(null);
    setActiveProject(null);
    setTaskFilter('all');
    setEmployeeFilter('all');
    setSelectedEmployee(null);
    setTasks([]); // clear tasks
  };
const filteredTasks = useMemo(() => {
  if (!tasks) return [];

  // Step 1: Role-based restriction
  let visible = userRole === 'admin'
    ? tasks
    : tasks.filter(t =>
        String(t.contact_person) === String(currentUserId) ||
        String(t.assigned_to) === String(currentUserId)
      );

  // Step 2: Status filter
  visible = visible.filter(t => {
    if (taskFilter === 'completed') return t.completed;
    if (taskFilter === 'incomplete') return !t.completed;
    return true;
  });

  // Step 3: Employee filter
  if (selectedEmployee) {
    visible = visible.filter(t => t.contact_person === selectedEmployee || t.assigned_to === selectedEmployee);
  } else if (employeeFilter === 'project' && selectedProject) {
    const projectEmployees = [...new Set(tasks.map(t => t.contact_person || t.assigned_to).filter(Boolean))];
    visible = visible.filter(t => projectEmployees.includes(t.contact_person || t.assigned_to));
  }

  return visible;
}, [tasks, userRole, currentUserId, taskFilter, employeeFilter, selectedEmployee, selectedProject]);


 

// Role-based visible projects

const visibleProjects = useMemo(() => {
  if (userRole === 'admin') return projects;

  // Only tasks assigned to the current user
  const userTasks = allTasks.filter(t => {
    const assignedId = t.assigned_to;
    const contactId = t.contact_person;
    return String(assignedId) === String(currentUserId) || String(contactId) === String(currentUserId);
  });

  const userProjectIds = new Set(userTasks.map(t => t.project_key));

  return projects.filter(p => userProjectIds.has(p._id));
}, [projects, allTasks, userRole, currentUserId]);




  const selectedProjectName = selectedProject
    ? projects.find(p => String(p._id) === selectedProject)?.name || "Unknown Project"
    : null;

  const showModal = (task) => {
    setModalDescription(task.description || 'No description provided');
    setShowDescriptionModal(true);
  };

  const getEmployeeStatus = (employeeId) => {
    if (!selectedProject) return null;
    const empTasks = tasks.filter(t => t.contact_person === employeeId);
    if (empTasks.length === 0) return null;
    return empTasks.every(t => t.completed) ? 'All Completed' : 'Incomplete Tasks';
  };
  

  return (
    <Layout>
      <div className="container" style={{ paddingTop: '20px' }}>
        <h4 className="mb-4 fw-bold" style={{ color: 'black' }}>
          📊 Dashboard Overview {selectedProjectName && <span style={{ color: 'black' }}>— {selectedProjectName}</span>}
        </h4>

        {/* Stats Cards */}
       
        <div className="row g-4">
          {/* Total Tasks */}
          <div className="col-md-4">
            {selectedProject ? (
              <div
                className="card text-center shadow-lg border-0 rounded-4"
                style={{ background: 'linear-gradient(135deg,#6f42c1,#8a2be2)', color: 'white', cursor: 'pointer' }}
                onClick={() => setTaskFilter('all')}
              >
                <div className="card-body">
                  <i className="bi bi-list-task fs-2"></i>
                  <h6 className="mt-2">Total Tasks (Project)</h6>
                  <h3>{projectTaskCount}</h3>
                </div>
              </div>
            ) : (
              <Link to="/task" style={{ textDecoration: 'none' }}>
                <div
                  className="card text-center shadow-lg border-0 rounded-4"
                  style={{ background: 'linear-gradient(135deg,#6f42c1,#8a2be2)', color: 'white', cursor: 'pointer' }}
                >
                  <div className="card-body">
                    <i className="bi bi-list-task fs-2"></i>
                    <h6 className="mt-2">Total Tasks (All)</h6>
                    <h3>
  {userRole === 'admin'
    ? taskCount
    : allTasks.filter(t => String(t.contact_person) === String(currentUserId)).length}
</h3>
                  </div>
                </div>
              </Link>
            )}
          </div>

        
         {/* Employees */}
<div className="col-md-4">
  {selectedProject ? (
    <div
      className="card text-center shadow-lg border-0 rounded-4"
      style={{ background: 'linear-gradient(135deg,#6f42c1,#8a2be2)', color: 'white', padding: '10px' }}
    >
      <div className="card-body">
        <i className="bi bi-people fs-2"></i>
        <h6 className="mt-2">Employees (Project)</h6>
        <div className="d-flex justify-content-between">

          {/* Completed Employees */}
          <div style={{ width: '48%' }}>
            <p className="mb-1 fw-bold" style={{ cursor: 'pointer' }} onClick={() => setTaskFilter('completed')}>
              ✔ Completed ({completedEmployeesCount})
            </p>
            <ul className="list-unstyled" style={{ maxHeight: '150px', overflowY: 'auto', color: 'white', paddingLeft: 0 }}>
              {[...new Set(tasks.filter(t => t.completed && t.contact_person).map(t => t.contact_person))]
                .map(empId => {
                  const emp = employees.find(e => e._id === empId);
                  if (!emp) return null;
                  return (
                    <li
                      key={emp._id}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedEmployee === emp._id ? 'rgba(0,0,0,0.3)' : 'transparent',
                        borderRadius: '4px',
                        padding: '2px 5px',
                        marginBottom: '2px'
                      }}
                      onClick={() => handleEmployeeClick(emp._id)}
                    >
                      {emp.name}
                    </li>
                  );
                })}
            </ul>
          </div>

          {/* Incomplete Employees */}
          <div style={{ width: '48%' }}>
            <p className="mb-1 fw-bold" style={{ cursor: 'pointer' }} onClick={() => setTaskFilter('incomplete')}>
              ⏳ Incomplete ({incompleteEmployeesCount})
            </p>
            <ul className="list-unstyled" style={{ maxHeight: '150px', overflowY: 'auto', color: 'white', paddingLeft: 0 }}>
              {[...new Set(tasks.filter(t => !t.completed && t.contact_person).map(t => t.contact_person))]
                .map(empId => {
                  const emp = employees.find(e => e._id === empId);
                  if (!emp) return null;
                  return (
                    <li
                      key={emp._id}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedEmployee === emp._id ? 'rgba(0,0,0,0.3)' : 'transparent',
                        borderRadius: '4px',
                        padding: '2px 5px',
                        marginBottom: '2px'
                      }}
                      onClick={() => handleEmployeeClick(emp._id)}
                    >
                      {emp.name}
                    </li>
                  );
                })}
            </ul>
          </div>

        </div>
      </div>
    </div>
  ) : (
    <Link to="/employee" style={{ textDecoration: 'none' }}>
      <div
        className="card text-center shadow-lg border-0 rounded-4"
        style={{ background: 'linear-gradient(135deg,#6f42c1,#8a2be2)', color: 'white', padding: '10px', cursor: 'pointer' }}
      >
        <div className="card-body">
          <i className="bi bi-people fs-2"></i>
          <h6 className="mt-2">Employees (All)</h6>
         <h3>
  {userRole === 'admin'
    ? employeeCount
    : allTasks
        .filter(t => String(t.contact_person) === String(currentUserId))
        .map(t => t.contact_person)
        .filter((v, i, a) => a.indexOf(v) === i).length
  }
</h3>
        </div>
      </div>
    </Link>
  )}
</div>


          {/* Task Overview */}
          <div className="col-md-4">
            <div className="card text-center shadow-lg border-0 rounded-4" style={{ background: 'linear-gradient(135deg,#6f42c1,#8a2be2)', color: 'white' }}>
              <div className="card-body">
                <i className="bi bi-check-circle fs-2"></i>
                <h6 className="mt-2">Task Overview {selectedProject ? `(Project)` : `(All)`}</h6>
                {selectedProject ? (
                  <>
                    <p className="mb-1">✔ Completed: {projectCompletedCount}</p>
                    <p className="mb-0">⏳ Incomplete: {projectIncompleteCount}</p>
                  </>
                ) : (
                  <>
                   <p className="mb-1">
  ✔ Completed: {userRole === 'admin'
    ? completedCount
    : allTasks.filter(t => String(t.contact_person) === String(currentUserId) && t.completed).length}
</p>
<p className="mb-0">
  ⏳ Incomplete: {userRole === 'admin'
    ? incompleteCount
    : allTasks.filter(t => String(t.contact_person) === String(currentUserId) && !t.completed).length}
</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        

        {(selectedProject || taskFilter !== 'all' || employeeFilter !== 'all') && (
          <div className="text-end mt-3">
            <button
              className="btn btn-sm"
              onClick={resetView}
              style={{ backgroundColor: '#6f42c1', color: 'white', borderColor: '#6f42c1', transition: '0.3s' }}
              onMouseEnter={e => { e.target.style.backgroundColor = '#dc3545'; e.target.style.borderColor = '#dc3545'; }}
              onMouseLeave={e => { e.target.style.backgroundColor = '#6f42c1'; e.target.style.borderColor = '#6f42c1'; }}
            >
              <i className="bi bi-x-circle me-1"></i> Reset View
            </button>
          </div>
        )}

        {/* Projects & Tasks */}
        <div className="row mt-4">
          {/* Projects */}
          <div className="col-md-4 mb-4">
            <div className="card shadow-lg border-0 rounded-4">
              <div className="card-header bg-primary text-white fw-bold rounded-top-4">Projects</div>
    <ul className="list-group list-group-flush">
  {loadingProjects ? (
    <li className="list-group-item">Loading projects...</li>
  ) : visibleProjects.length === 0 ? (
    <li className="list-group-item">No projects found</li>
  ) : (
    visibleProjects.map(project => (
      <li
        key={project._id}
        className={`list-group-item list-group-item-action ${activeProject === String(project.project_key || project._id) ? 'active bg-primary text-white' : ''}`}
        onClick={() => handleProjectClick(project)}
        style={{ cursor: 'pointer' }}
      >
        {project.name}
      </li>
    ))
  )}
</ul>


            </div>
          </div>

          {/* Tasks */}
          <div className="col-md-8">
            {!selectedProject ? (
              <div className="alert alert-info rounded-4">👈 Please select a project to view its tasks.</div>
            ) : loadingTasks ? (
              <p>Loading tasks...</p>
            ) : filteredTasks.length > 0 ? (
              <div className="card shadow-lg border-0 rounded-4">
                <div className="card-header bg-primary text-white fw-bold rounded-top-4">
                  Tasks for Project: {selectedProjectName}
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-striped table-hover align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Project</th>
                          <th>Task ID</th>
                          <th>Name</th>
                          <th>Description</th>
                          <th>Contact Person</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.map(task => {
                          const projectName = projects.find(p => String(p._id) === String(task.project_key))?.name || 'Unknown Project';
                          const contact = employees.find(e => e._id === task.contact_person);
                          const contactName = contact?.name || task.contact_person || 'No Contact';
                          const empStatus = contact ? getEmployeeStatus(contact._id) : null;
                          return (
                            <tr key={task._id}>
                              <td>{projectName}</td>
                              <td>{task.continuousId}</td>
                              <td>{task.name}</td>
                             <td
  style={{ cursor: 'pointer', color: 'black', whiteSpace: 'pre-wrap' }}
  onClick={() => showModal(task)}
>
  <div
    className="task-description"
    dangerouslySetInnerHTML={{
      __html:
        task.description && task.description.length > 50
          ? task.description.slice(0, 50) + "..."
          : task.description || "—",
    }}
  />
</td>

                              <td>
                                {contact ? (
                                  <span
                                    style={{ cursor: 'pointer', color: 'black' }}
                                    onClick={() => handleEmployeeClick(contact._id)}
                                  >
                                    {contactName}
                                  </span>
                                ) : contactName}
                                {empStatus && (
                                  <span className={`badge ms-2 ${empStatus === 'All Completed' ? 'bg-success' : 'bg-warning'}`}>
                                    {empStatus}
                                  </span>
                                )}
                              </td>
                              <td>
                                <span
                                  className={`badge ${task.completed ? 'bg-success' : 'bg-warning'} d-flex align-items-center`}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => setTaskFilter(task.completed ? 'completed' : 'incomplete')}
                                >
                                  {task.completed ? <i className="bi bi-check-circle me-1"></i> : <i className="bi bi-hourglass-split me-1"></i>}
                                  {task.completed ? 'Complete' : 'Incomplete'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="alert alert-info rounded-4">No tasks for this project.</div>
            )}
          </div>
        </div>

        {/* Task Description Modal */}
        <Modal show={showDescriptionModal} onHide={() => setShowDescriptionModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Task Description</Modal.Title>
          </Modal.Header>
         <Modal.Body>
  <div
    className="task-description"
    dangerouslySetInnerHTML={{ __html: modalDescription }}
  />
</Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDescriptionModal(false)}>Close</Button>
          </Modal.Footer>
        </Modal>
      </div>
    </Layout>
  );
}

export default Dashboard;
