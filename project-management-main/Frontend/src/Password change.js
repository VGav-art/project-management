import React, { useState } from "react";
import axios from "axios";
import { Modal, Button, Form, Spinner } from "react-bootstrap";

const PasswordChangeModal = ({ showModal, closeModal }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    // validate passwords
    if (newPassword !== confirmNewPassword) {
      setErrorMessage("New password and confirmation do not match.");
      setLoading(false);
      return;
    }
    if (currentPassword === newPassword) {
      setErrorMessage("The new password cannot be the same as the current password.");
      setLoading(false);
      return;
    }

    try {
      const authToken = localStorage.getItem("authToken");

      const res = await axios.post(
        "http://localhost:8083/user/change-password",
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      console.log("Password change response:", res.data);

      if (res.data.success) {
        localStorage.setItem("authToken", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        setErrorMessage(""); // ✅ clear any old error
        setSuccessMessage(res.data.message);

        // ✅ show success flash, then close + refresh
        setTimeout(() => {
          resetState();
          closeModal();
          window.location.reload();
        }, 1000);
      } else {
        setErrorMessage(res.data.message || "Password change failed");
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "An error occurred while changing password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={showModal}
      onHide={() => {
        resetState();
        closeModal();
      }}
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>Change Password</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
        {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}

        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="currentPassword">
            <Form.Label>Current Password</Form.Label>
            <Form.Control
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group controlId="newPassword" className="mt-2">
            <Form.Label>New Password</Form.Label>
            <Form.Control
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group controlId="confirmNewPassword" className="mt-2">
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
            className="w-100 mt-3"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />{" "}
                Changing...
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default PasswordChangeModal;
