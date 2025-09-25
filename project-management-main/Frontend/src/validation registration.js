function Validation (values) {
    let error = {}
    const email_pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const password_pattern = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
    
    if(values.name === "") {
        error.name = " Name should not be empty"
    }
    else {
        error.name = ""
    }

    if(values.email === "") {
        error.email = " Email should not be empty"
    }
    else if(email_pattern.test(values.email)){
        error.email = ""
    }
    else{
        error.email = "Incorrect email type"
    }
    if(values.password === "") {
        error.password = " Password should not be empty"
    }
    else if(password_pattern.test(values.password)){
        error.password = ""
    }
    else{
        error.password = "Password must be at least 8 characters long, contain one uppercase letter, and one special character."
    }
    
    return error;

}



export default Validation