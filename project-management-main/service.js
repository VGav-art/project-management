register = async (name, email, password) => {
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error('Email already registered');
        }

        const newUser = new User({ name, email, password });
        await newUser.save();
        return { success: true, message: 'Registration successful' };
    } catch (error) {
        throw error;
    }
};