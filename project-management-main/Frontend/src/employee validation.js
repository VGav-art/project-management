const Validation = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Simple email regex pattern
    return regex.test(email);
};

const isValidPhoneNumber = (number) => {
    const phoneRegex = /^[0-9]{10}$/; // Example regex for a 10-digit number
    return phoneRegex.test(number);
  };
export { Validation, isValidPhoneNumber};
