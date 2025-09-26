const logOut = async () => {
  try {
    // Clear specific keys
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("authToken");

    // Or clear everything if that's acceptable
    // localStorage.clear();

    // Redirect to login
    window.location.href = ':';
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

export default logOut;
