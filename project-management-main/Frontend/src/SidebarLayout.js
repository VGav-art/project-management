import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Nav, Offcanvas } from "react-bootstrap";

const SidebarLayout = ({ children }) => {
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const userName = localStorage.getItem("userName");

  const handleShow = () => setShowOffcanvas(true);
  const handleClose = () => setShowOffcanvas(false);

  return (
    <div className="d-flex" style={{ height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <Nav
        className="flex-column text-white p-4 d-none d-md-block shadow-sm"
        style={{ backgroundColor: "#1d2531", width: "20vw", height: "100%", overflowY: "auto" }}
      >
        <h3 className="text-white mb-4 fw-bold">📌 Menu</h3>
        <Nav.Link as={Link} to="/dashboard" className="text-white mb-3">
          <i className="bi bi-speedometer2 me-2"></i> Dashboard
        </Nav.Link>
        <Nav.Link as={Link} to="/task" className="text-white mb-3">
          <i className="bi bi-list-task me-2"></i> Tasks
        </Nav.Link>
        <Nav.Link as={Link} to="/department" className="text-white mb-3">
          <i className="bi bi-building me-2"></i> Department
        </Nav.Link>
        <Nav.Link as={Link} to="/employee" className="text-white mb-3">
          <i className="bi bi-people me-2"></i> Staff
        </Nav.Link>
        <Nav.Link as={Link} to="/project" className="text-white mb-3">
          <i className="bi bi-folder-fill me-2"></i> Projects
        </Nav.Link>
        <Nav.Link as={Link} to="/logout" className="text-white mb-3">
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
            <Nav.Link as={Link} to="/dashboard" onClick={handleClose}>Dashboard</Nav.Link>
            <Nav.Link as={Link} to="/task" onClick={handleClose}>Tasks</Nav.Link>
            <Nav.Link as={Link} to="/department" onClick={handleClose}>Department</Nav.Link>
            <Nav.Link as={Link} to="/employee" onClick={handleClose}>Staff</Nav.Link>
            <Nav.Link as={Link} to="/project" onClick={handleClose}>Projects</Nav.Link>
            <Nav.Link as={Link} to="/logout" onClick={handleClose}>Log Out</Nav.Link>
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Main content */}
      <div className="flex-grow-1" style={{ backgroundColor: "#f8f9fa", overflowY: "auto" }}>
        {/* Top bar */}
        <div
          className="d-flex align-items-center justify-content-end shadow-sm"
          style={{
            padding: "0.5rem 1rem",
            fontSize: "18px",
            background: "linear-gradient(90deg,#6B6A03,#4e4d01)",
            position: "fixed",
            height: "65px",
            top: 0,
            left: 0,
            right: 0,
            width: "100%",
            zIndex: 1000,
          }}
        >
          <Button
            variant="link"
            className="text-white d-md-none position-absolute"
            onClick={handleShow}
            style={{ fontSize: "1.2rem", left: "10px" }}
          >
            <i className="bi bi-list"></i>
          </Button>
          <div className="d-flex align-items-center text-white">
            <i className="bi bi-person-circle fs-4 me-2"></i>
            <span className="fw-bold">{userName}</span>
          </div>
        </div>

        {/* Page content */}
        <div style={{ paddingTop: "80px" }}>{children}</div>
      </div>
    </div>
  );
};

export default SidebarLayout;
