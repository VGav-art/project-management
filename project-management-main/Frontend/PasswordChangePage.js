import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import PasswordChangeModal from './PasswordChangeModal';

const PasswordChangePage = () => {
    const [showModal, setShowModal] = useState(false);

    return (
        <div>
            <Button variant="primary" className="mt-3" onClick={() => setShowModal(true)}>
                Change Password
            </Button>

            <PasswordChangeModal
                showModal={showModal}
                closeModal={() => setShowModal(false)}
            />
        </div>
    );
};

export default PasswordChangePage;
