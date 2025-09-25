import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Modal, Badge } from 'react-bootstrap';
import Layout from './Layout';
import './employee.css';

const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:8083';

const EmployeeTable = () => {
  const userRole = localStorage.getItem('userRole');
  const userName = localStorage.getItem('userName');

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const teamsPerPage = 3; // Number of teams (departments) per page

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    phone: '',
    departmentId: ''
  });

  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editedEmployee, setEditedEmployee] = useState({
    name: '',
    email: '',
    phone: '',
    departmentId: ''
  });

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
      setDepartments(res.data.departments || []);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to fetch departments');
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/employee`);
      const normalized = (res.data.employees || []).map(emp => ({
        ...emp,
        phone: emp.telephone_no || '',
        departmentId: emp.departmentId?._id || emp.departmentId || '',
        department: emp.departmentId?.name || emp.department || 'Unassigned'
      }));
      setEmployees(normalized);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to fetch employees');
    }
  };

  const handleAddEmployee = async () => {
    const { name, email, phone, departmentId } = newEmployee;
    if (!name.trim() || !email.trim() || !phone.trim() || !departmentId) {
      setErrorMessage('All fields are required');
      return;
    }

    setLoading(true);
    try {
      const departmentObj = departments.find(d => String(d._id) === String(departmentId));
      if (!departmentObj) {
        setErrorMessage('Select a valid department');
        setLoading(false);
        return;
      }

      const payload = {
        name: name.trim(),
        email: email.trim(),
        telephone_no: phone.trim(),
        departmentId: departmentObj._id,
        department: departmentObj.name
      };

      const res = await axios.post(`${BASE_URL}/employee`, payload);
      if (res.data.success) {
        setSuccessMessage('✅ Employee added successfully');
        setNewEmployee({ name: '', email: '', phone: '', departmentId: '' });
        setShowModal(false);
        await fetchEmployees();
      } else {
        setErrorMessage(res.data.message || 'Failed to add employee');
      }
    } catch (err) {
      console.error('Add employee error:', err.response?.data || err.message);
      setErrorMessage(err.response?.data?.message || 'Error adding employee');
    } finally {
      setLoading(false);
    }
  };

  const handleEditEmployee = (emp) => {
    setEditingEmployeeId(emp._id);
    setEditedEmployee({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      departmentId: emp.departmentId || ''
    });
  };

  const handleUpdateEmployee = async () => {
    const { name, email, phone, departmentId } = editedEmployee;
    if (!name || !email || !phone || !departmentId) {
      setErrorMessage('All fields are required');
      return;
    }

    try {
      const departmentObj = departments.find(d => String(d._id) === String(departmentId));
      if (!departmentObj) {
        setErrorMessage('Select a valid department');
        return;
      }

      const payload = {
        id: editingEmployeeId,
        name: name.trim(),
        email: email.trim(),
        telephone_no: phone.trim(),
        departmentId: departmentObj._id
      };

      const res = await axios.put(`${BASE_URL}/employee/update`, payload);
      if (res.data.success) {
        setSuccessMessage('✅ Employee updated successfully');
        setEditingEmployeeId(null);
        await fetchEmployees();
      } else {
        setErrorMessage(res.data.message || 'Failed to update employee');
      }
    } catch (err) {
      console.error('Update employee error:', err.response?.data || err.message);
      setErrorMessage(err.response?.data?.message || 'Error updating employee');
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      const res = await axios.delete(`${BASE_URL}/employee/${id}`);
      if (res.data.success || res.data.message === 'Employee deleted successfully') {
        setSuccessMessage('🗑️ Employee deleted successfully');
        await fetchEmployees();
      } else {
        setErrorMessage(res.data.message || 'Failed to delete employee');
      }
    } catch (err) {
      console.error('Delete employee error:', err.response?.data || err.message);
      setErrorMessage(err.response?.data?.message || 'Error deleting employee');
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group employees into teams (by department)
  const groupedEmployees = filteredEmployees.reduce((groups, emp) => {
    const dept = emp.department || "Unassigned";
    if (!groups[dept]) groups[dept] = [];
    groups[dept].push(emp);
    return groups;
  }, {});

  const highlightMatch = (text) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part) ? <mark key={i}>{part}</mark> : part
    );
  };

  // Pagination by teams (departments)
  const teamEntries = Object.entries(groupedEmployees);
  const totalPages = Math.ceil(teamEntries.length / teamsPerPage);
  const displayedTeams = teamEntries.slice((currentPage - 1) * teamsPerPage, currentPage * teamsPerPage);

  const goNext = () => setCurrentPage(p => Math.min(p + 1, totalPages));
  const goPrev = () => setCurrentPage(p => Math.max(p - 1, 1));

  return (
    <Layout>
      <div className="employee-container">
        {/* Alerts */}
        {successMessage && <div className="alert alert-success modern-alert">{successMessage}</div>}
        {errorMessage && <div className="alert alert-danger modern-alert">{errorMessage}</div>}

        {/* Search & Add */}
        <div className="d-flex justify-content-center align-items-center mb-3 flex-wrap">
          <input
            type="text"
            className="form-control search-box me-2 mb-2"
            placeholder="🔍 Search by name or department..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ maxWidth: '350px' }}
          />
          {userRole === 'admin' && (
            <Button className="mb-2" style={{ width: '150px', backgroundColor: '#6f42c1', borderColor: '#6f42c1', color: '#fff' }} onClick={() => setShowModal(true)}>
              <i className="bi bi-plus-circle me-2"></i> New Employee
            </Button>
          )}
        </div>

        {/* Grouped Teams (with scrollbar if >5 employees) */}
        {displayedTeams.map(([dept, team]) => (
          <div key={dept} className="mb-4">
            <h5 className="mb-3">
              <Badge bg="primary" className="me-2">{dept}</Badge> Team
            </h5>
            <div className="table-responsive modern-table-wrapper" style={{ maxHeight: team.length > 5 ? '300px' : 'auto', overflowY: team.length > 5 ? 'auto' : 'visible' }}>
              <table className="table modern-table align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    {userRole === 'admin' && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {team.map(emp => {
                    const id = emp._id;
                    return (
                      <tr key={id}>
                        <td>{editingEmployeeId === id
                          ? <input className="form-control" value={editedEmployee.name} onChange={e => setEditedEmployee({ ...editedEmployee, name: e.target.value })} />
                          : highlightMatch(emp.name)}</td>
                        <td>{editingEmployeeId === id
                          ? <input className="form-control" value={editedEmployee.email} onChange={e => setEditedEmployee({ ...editedEmployee, email: e.target.value })} />
                          : emp.email}</td>
                        <td>{editingEmployeeId === id
                          ? <input className="form-control" value={editedEmployee.phone} onChange={e => setEditedEmployee({ ...editedEmployee, phone: e.target.value })} />
                          : emp.phone}</td>
                        {userRole === 'admin' && (
                          <td>
                            {editingEmployeeId === id
                              ? <Button size="sm" variant="success" onClick={handleUpdateEmployee}>💾 Save</Button>
                              : <>
                                <Button size="sm" variant="outline-warning" className="me-2" onClick={() => handleEditEmployee(emp)}>✏️ Edit</Button>
                                <Button size="sm" variant="outline-danger" onClick={() => handleDeleteEmployee(id)}>🗑️ Delete</Button>
                              </>}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Pagination for teams */}
        {teamEntries.length > teamsPerPage && (
          <nav aria-label="Team pagination" className="mt-3">
            <ul className="pagination pagination-modern justify-content-center">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={goPrev}>Prev</button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(page)}>{page}</button>
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={goNext}>Next</button>
              </li>
            </ul>
          </nav>
        )}

        {/* Add Employee Modal */}
        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton><Modal.Title>Add Employee</Modal.Title></Modal.Header>
          <Modal.Body>
            <input type="text" placeholder="Name" className="form-control mb-2" value={newEmployee.name} onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })} />
            <input type="email" placeholder="Email" className="form-control mb-2" value={newEmployee.email} onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })} />
            <input type="text" placeholder="Phone" className="form-control mb-2" value={newEmployee.phone} onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value })} />
            <select className="form-select mb-2" value={newEmployee.departmentId} onChange={e => setNewEmployee({ ...newEmployee, departmentId: e.target.value })}>
              <option value="">Select Department</option>
              {departments.map(dep => <option key={dep._id} value={dep._id}>{dep.name}</option>)}
            </select>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
            <Button className="btn-gradient" onClick={handleAddEmployee} disabled={loading}>{loading ? 'Saving...' : 'Save Employee'}</Button>
          </Modal.Footer>
        </Modal>
      </div>
    </Layout>
  );
};

export default EmployeeTable;
