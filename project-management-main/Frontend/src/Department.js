import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import Layout from './Layout';
import './Department.css';

const BASE_URL = 'http://localhost:8083';

const DepartmentTable = () => {
  const userRole = localStorage.getItem('userRole');

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [expandedDepartments, setExpandedDepartments] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [editedDepartmentName, setEditedDepartmentName] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/department`);
      setDepartments(Array.isArray(res.data.departments) ? res.data.departments : []);
    } catch {
      setDepartments([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/employee`);
      const normalized = (res.data.employees || []).map(emp => ({
        ...emp,
        phone: emp.telephone_no || '',
        departmentId: typeof emp.departmentId === 'object' && emp.departmentId ? emp.departmentId._id : emp.departmentId || '',
        departmentName: typeof emp.departmentId === 'object' && emp.departmentId ? emp.departmentId.name : emp.department || 'Unassigned',
      }));
      setEmployees(normalized);
    } catch {
      setEmployees([]);
    }
  };

  const toggleDepartment = (depId) => setExpandedDepartments(prev => ({ ...prev, [depId]: !prev[depId] }));
  const handleModalOpen = () => setShowModal(true);
  const handleModalClose = () => { setShowModal(false); setNewDepartmentName(''); setErrorMessage(''); };

  const handleAddDepartment = async () => {
    if (!newDepartmentName.trim()) return setErrorMessage('Department name cannot be empty.');
    if (departments.some(dep => dep.name.toLowerCase() === newDepartmentName.trim().toLowerCase()))
      return setErrorMessage('Department name already exists.');
    try {
      const res = await axios.post(`${BASE_URL}/department`, { name: newDepartmentName });
      if (res.data.success) {
        fetchDepartments();
        setSuccessMessage('Department added successfully!');
        setNewDepartmentName('');
        setShowModal(false);
      } else setErrorMessage(res.data.message || 'Failed to add department.');
    } catch {
      setErrorMessage('Error adding department.');
    }
  };

  const handleEditDepartment = (dep) => {
    setEditingDepartmentId(dep._id);
    setEditedDepartmentName(dep.name);
  };

  const handleUpdateDepartment = async () => {
    if (!editedDepartmentName.trim()) return setErrorMessage('Department name cannot be empty.');
    try {
      const res = await axios.put(`${BASE_URL}/department/${editingDepartmentId}`, { name: editedDepartmentName });
      if (res.data.success) {
        fetchDepartments();
        setSuccessMessage('Department updated successfully!');
        setEditingDepartmentId(null);
      } else setErrorMessage(res.data.message || 'Failed to update department.');
    } catch {
      setErrorMessage('Error updating department.');
    }
  };

  const handleDeleteDepartment = async (depId) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      const res = await axios.delete(`${BASE_URL}/department/${depId}`);
      if (res.data.success) {
        setDepartments(prev => prev.filter(dep => dep._id !== depId));
        setSuccessMessage('Department deleted successfully!');
      } else setErrorMessage('Failed to delete department.');
    } catch {
      setErrorMessage('Error deleting department.');
    }
  };

  return (
    <Layout>
      <div className="container-fluid p-4">
        {successMessage && <p className="text-success">{successMessage}</p>}
        {errorMessage && <p className="text-danger">{errorMessage}</p>}

        {userRole === 'admin' &&   <Button className=" mb-2" style={{ width: '150px', backgroundColor: '#6f42c1', borderColor: '#6f42c1', color: '#fff'  }} onClick={() => setShowModal(true)}>
                      <i className="bi bi-plus-circle me-2"></i> New Department
                    </Button>}

        {departments.length === 0 ? (
          <p>No departments found.</p>
        ) : (
          departments.map(dep => {
            const depEmployees = employees.filter(emp => emp.departmentId === dep._id);
            const showEmployees = expandedDepartments[dep._id] || false;

            return (
              <div key={dep._id} className="mb-4">
                {/* Department Header */}
                <div
                  className="d-flex justify-content-between align-items-center p-3 rounded shadow-sm department-card"
                  onClick={() => toggleDepartment(dep._id)}
                >
                  <div>
                    {editingDepartmentId === dep._id ? (
                      <input
                        type="text"
                        className="form-control d-inline-block"
                        style={{ width: '200px' }}
                        value={editedDepartmentName}
                        onChange={(e) => setEditedDepartmentName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateDepartment();
                          if (e.key === 'Escape') setEditingDepartmentId(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <strong>{dep.name}</strong>
                    )}
                    <span className="text-muted"> ({depEmployees.length} Staff)</span>
                  </div>

                  <div>
                    {userRole === 'admin' && (
                      <>
                        <Button
                          size="sm"
                          variant={editingDepartmentId === dep._id ? "success" : "outline-warning"}
                          className="me-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (editingDepartmentId === dep._id) {
                              handleUpdateDepartment();
                            } else {
                              handleEditDepartment(dep);
                            }
                          }}
                        >
                          {editingDepartmentId === dep._id ? 'Save' : 'Edit'}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={(e) => { e.stopPropagation(); handleDeleteDepartment(dep._id); }}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Employee Cards */}
                {showEmployees && depEmployees.length > 0 && (
                  <div className="employee-scroll-container mt-3">
                    {depEmployees.map(emp => (
                      <div key={emp._id} className="employee-card shadow-sm">
                        <div className="employee-avatar">{emp.name.charAt(0).toUpperCase()}</div>
                        <h6 className="mb-1 text-truncate">{emp.name}</h6>
                        <p className="mb-1"><i className="bi bi-telephone me-1"></i>{emp.phone || "N/A"}</p>
                        <span className="employee-badge">{emp.departmentName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Add Department Modal */}
        <Modal show={showModal} onHide={handleModalClose}>
          <Modal.Header closeButton><Modal.Title>Add Department</Modal.Title></Modal.Header>
          <Modal.Body>
            <input
              type="text"
              placeholder="Department Name"
              className="form-control"
              value={newDepartmentName}
              onChange={e => setNewDepartmentName(e.target.value)}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleModalClose}>Close</Button>
            <Button className="btn-gradient" onClick={handleAddDepartment}>Save</Button>
          </Modal.Footer>
        </Modal>
      </div>
    </Layout>
  );
};

export default DepartmentTable;
