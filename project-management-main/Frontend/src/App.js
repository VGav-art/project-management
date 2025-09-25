import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
// import { ChakraProvider } from '@chakra-ui/react'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './Login';
import Register from './User Registration';
import Dashboard from './dashboard'
import TaskTable from './Tasks';
import EmployeeTable from './employee';
import ProtectedRoute from './Protected Route';
import DepartmentTable from './Department';
import Project from './Project';
import PasswordChange from './Password change';
import Logout from './logout';
//require('dotenv').config();

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <Routes>
            {/* Redirect to Login page if no specific route is provided */}
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />            
            <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/register" element={<Register />} />
            <Route path="/task" element={<ProtectedRoute><TaskTable /></ProtectedRoute> }/>
            <Route path="/employee" element={<ProtectedRoute><EmployeeTable /></ProtectedRoute>} /> 
            <Route path='/department' element={<ProtectedRoute><DepartmentTable/></ProtectedRoute>} />
            <Route path='/project' element={<ProtectedRoute><Project/></ProtectedRoute>} />   
            <Route path='/password' element={<ProtectedRoute><PasswordChange/></ProtectedRoute>} />  
            <Route path='/logout' element={<ProtectedRoute><Logout/></ProtectedRoute>} />                    
          </Routes>
        </header>
      </div>
    </Router>
  );
}

export default App;

