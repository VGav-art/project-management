import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Nav from 'react-bootstrap/Nav';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Button from 'react-bootstrap/Button';
import { Modal, Form, Spinner, Dropdown } from 'react-bootstrap';
import axios from 'axios';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './dashboard.css';
import logo from './lociafrica_limited_cover.jpg';

const Layout = ({ children }) => {
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const userName = localStorage.getItem('userName');

  const handleShow = () => setShowOffcanvas(true);
  const handleClose = () => setShowOffcanvas(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const resetPasswordState = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(false);
  };

  const logOut = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('New password and confirmation do not match.');
      setLoading(false);
      return;
    }
    if (currentPassword === newPassword) {
      setErrorMessage('The new password cannot be the same as the current password.');
      setLoading(false);
      return;
    }

    try {
      const authToken = localStorage.getItem('authToken');
      const res = await axios.post(
        `http://localhost:8083/user/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (res.data.success) {
        setErrorMessage('');
        setSuccessMessage(res.data.message);
        setTimeout(() => {
          resetPasswordState();
          setShowPasswordModal(false);
          logOut();
        }, 1500);
      } else {
        setErrorMessage(res.data.message || 'Password change failed');
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'An error occurred while changing password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Nav className="flex-column text-purple p-4 d-none d-md-block shadow-sm"
        style={{ backgroundColor: '#1d2531', width: '20vw', height: '100%', overflowY: 'auto' }}>
        <h3 className="text-white mb-4 fw-bold">📌 Menu</h3>
        <Nav.Link as={Link} to="/dashboard/*" className="text-white mb-3"><i className="bi bi-speedometer2 me-2"></i> Dashboard</Nav.Link>
        <Nav.Link as={Link} to="/task" className="text-white mb-3"><i className="bi bi-list-task me-2"></i> Tasks</Nav.Link>
        <Nav.Link as={Link} to="/department" className="text-white mb-3"><i className="bi bi-building me-2"></i> Department</Nav.Link>
        <Nav.Link as={Link} to="/employee" className="text-white mb-3"><i className="bi bi-people me-2"></i> Staff</Nav.Link>
        <Nav.Link as={Link} to="/project" className="text-white mb-3"><i className="bi bi-folder-fill me-2"></i> Projects</Nav.Link>
        {/* Retained password & logout */}
        <Nav.Link className="text-white mb-3" onClick={() => setShowPasswordModal(true)}>
          <i className="bi bi-key-fill me-2"></i> Change Password
        </Nav.Link>
        <Nav.Link onClick={logOut} className="text-white mb-3">
          <i className="bi bi-box-arrow-right me-2"></i> Log Out
        </Nav.Link>
      </Nav>

      {/* Offcanvas for mobile */}
      <Offcanvas show={showOffcanvas} onHide={handleClose} placement="start">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column">
            <Nav.Link as={Link} to="/dashboard/*" onClick={handleClose}>Dashboard</Nav.Link>
            <Nav.Link as={Link} to="/task" onClick={handleClose}>Tasks</Nav.Link>
            <Nav.Link as={Link} to="/department" onClick={handleClose}>Department</Nav.Link>
            <Nav.Link as={Link} to="/employee" onClick={handleClose}>Staff</Nav.Link>
            <Nav.Link as={Link} to="/project" onClick={handleClose}>Projects</Nav.Link>
            <Nav.Link onClick={() => { setShowPasswordModal(true); handleClose(); }}>Change Password</Nav.Link>
            <Nav.Link onClick={logOut}>Log Out</Nav.Link>
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Main content */}
      <div className="flex-grow-1" style={{ backgroundColor: '#f8f9fa', overflowY: 'auto' }}>
        {/* Top bar */}
        <div
          className="d-flex align-items-center justify-content-between shadow-sm"
          style={{
            padding: '0.5rem 1rem',
            background: '#ffffff',
            position: 'fixed',
            height: '65px',
            top: 0,
            left: 0,
            right: 0,
            width: '100%',
            zIndex: 1000
          }}
        >
          {/* Left: Hamburger (mobile only) */}
          <Button
            variant="link"
            className="text-purple d-md-none"
            onClick={handleShow}
            style={{ fontSize: '1.5rem' }}
          >
            <i className="bi bi-list"></i>
          </Button>

          {/* Center: Logo */}
          <div className="flex-grow-1 d-flex justify-content-center">
            <Link to="/dashboard/*">
              <img
                src={logo}
                alt="Company Logo"
                style={{ height: '50px', objectFit: 'contain', cursor: 'pointer' }}
              />
            </Link>
          </div>

          {/* Right: User dropdown */}
          <Dropdown align="end">
            <Dropdown.Toggle variant="link" id="dropdown-user" className="text-purple d-flex align-items-center p-0">
              <i className="bi bi-person-circle fs-4 me-2"></i>
              <span className="fw-bold">{userName}</span>
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Item onClick={() => setShowPasswordModal(true)}>
                <i className="bi bi-key-fill me-2"></i> Change Password
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={logOut}>
                <i className="bi bi-box-arrow-right me-2"></i> Log Out
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>

        <div style={{ paddingTop: '80px', paddingLeft: '1rem', paddingRight: '1rem' }}>
          {children}
        </div>
      </div>

      {/* Password Change Modal */}
      <Modal
        show={showPasswordModal}
        onHide={() => {
          resetPasswordState();
          setShowPasswordModal(false);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Change Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
          {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
          <Form onSubmit={handlePasswordSubmit}>
            <Form.Group controlId="currentPassword" className="mb-2">
              <Form.Label>Current Password</Form.Label>
              <Form.Control
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group controlId="newPassword" className="mb-2">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group controlId="confirmNewPassword" className="mb-2">
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Button
              variant="primary"
              type="submit"
              className="w-100 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Changing...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Layout;
