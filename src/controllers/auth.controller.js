const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');
const organizationModel = require('../models/organization.model');

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, organizationName } = req.body;

    if (!name || !email || !password || !organizationName) {
      return res.status(400).json({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "name, email, password, and organizationName are required"
      });
    }

    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Email is already in use"
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // For simplicity, we create an organization here or you could find an existing one
    const organization = await organizationModel.createOrganization(organizationName);

    const newUser = await userModel.createUser({
      name,
      email,
      password: hashedPassword,
      role: role || 'MEMBER',
      orgId: organization.id
    });

    res.status(201).json({
      status: 201,
      message: "User registered successfully",
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        organization: organization.name
      }
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "email and password are required"
      });
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        status: 401,
        code: "UNAUTHORIZED",
        message: "Invalid email or password"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: 401,
        code: "UNAUTHORIZED",
        message: "Invalid email or password"
      });
    }

    const payload = {
      id: user.id,
      role: user.role,
      orgId: user.orgId
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      status: 200,
      message: "Login successful",
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organization: user.organization.name
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login
};
