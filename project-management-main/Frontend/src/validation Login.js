function Validation (values) {
    let error = {}
    const email_pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    // const password_pattern = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/

    if(values.email === "") {
        error.email = " Email should not be empty"
    }
    else if(email_pattern.test(values.email)){
        error.email = ""
    }
    else{
        error.email = "Incorrect email"
    }
    if(values.password === "") {
        error.password = " Password should not be empty"
    }
   
    return error;

}
export default Validation