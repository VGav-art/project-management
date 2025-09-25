import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from './lociafrica_limited_cover.jpg';

function Login() {
  const [values, setValues] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleInput = (event) => {
    setValues((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const validateForm = () => {
    if (!values.email || !values.password) {
      setError('Both email and password are required.');
      return false;
    }
    const emailPattern = /\S+@\S+\.\S+/;
    if (!emailPattern.test(values.email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    return true;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    axios.post(`http://localhost:8083/login`, values)
      .then(res => {
        setIsLoading(false);
        if (res.data.message === "Login successful") {
          const { role: userRole, email: adminEmail, name: userName, authToken, _id: userId } = res.data;

          const sessionDuration = 60 * 60 * 1000; // 1 hour
          const sessionExpiryTime = Date.now() + sessionDuration;

          // Save session details
          localStorage.setItem('authToken', authToken);
          localStorage.setItem('userRole', userRole);
          localStorage.setItem('userName', userName);
          localStorage.setItem('userEmail', adminEmail);
          localStorage.setItem('userId', userId);   // ✅ Store userId here
          localStorage.setItem('sessionExpiryTime', sessionExpiryTime);

          navigate('/dashboard');
        }
      })
      .catch(err => {
        setIsLoading(false);
        if (err.response && err.response.status === 401) {
          setError('Invalid email or password');
        } else if (err.response && err.response.status === 400) {
          setError('Email and password are required');
        } else {
          setError('An error occurred during login. Please try again later.');
        }
      });
  };

  return (
    <div className='d-flex justify-content-center align-items-center bg-primary vh-100'>
      <div
        className='bg-white p-4 rounded d-flex flex-column justify-content-center align-items-center'
        style={{ maxWidth: '400px', width: '100%' }}
      >
        {/* Logo image */}
        <img
          src={logo}
          alt="Login Illustration"
          className="img-fluid mb-3"
          style={{ width: '80%', height: 'auto' }}
        />
        <h2 className='text-center'>Login</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit} className='w-100'>
          <div className='mb-3'>
            <label htmlFor="email"><strong>Email</strong></label>
            <input
              type="email"
              placeholder='Enter Email'
              name='email'
              onChange={handleInput}
              className='form-control rounded-0'
            />
          </div>

          <div className='mb-3'>
            <label htmlFor="password"><strong>Password</strong></label>
            <input
              type="password"
              placeholder='Enter Password'
              name='password'
              onChange={handleInput}
              className='form-control rounded-0'
            />
          </div>

          <button
            type='submit'
            className='btn btn-success w-100'
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>

          <p className='mt-3 text-center'>
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
