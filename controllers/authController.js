const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const crypto = require('crypto');

const Users = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, code, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(code).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await Users.create({ ...req.body });
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1. Check If email and password exists
  if (!email || !password) {
    return next(new AppError('Email and password is required!', 400));
  }

  //2.Check if user exits and password is correct
  const user = await Users.findOne({ email }).select('+password');

  if (!user || !(await user.isCorrectPassword(password, user.password)))
    return next(new AppError('Email or Password is invalid!', 401));

  //3. If everything is correct then send the token to the client
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //1. Check if token exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ').at(1);
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token)
    return next(
      new AppError('You are not logged in! Please log in to continue.'),
    );

  //2. Verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3. Check if user still exists
  const currentUser = await Users.findById(decoded.id);
  if (!currentUser)
    return next(new AppError('User of this token does not exist!', 401));

  //4. Check if user changed the password after the token was issued
  if (currentUser.hasChangedPassword(decoded.iat))
    return next(
      new AppError(
        'User recently changed the password. Please login again!',
        401,
      ),
    );

  //Grant access to the protected route
  req.user = currentUser;
  res.locals.user = currentUser;

  next();
});

exports.isLoggedIn = async (req, res, next) => {
  //1. Check if token exists
  if (req.cookies.jwt) {
    try {
      //2. Verification of token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      //3. Check if user still exists
      const currentUser = await Users.findById(decoded.id);

      if (!currentUser) return next();

      //4. Check if user changed the password after the token was issued
      if (currentUser.hasChangedPassword(decoded.iat)) return next();

      //Grant access to the protected route
      res.locals.user = currentUser;
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.logout = (req, res) => {
  res.cookie('jwt', 'Logged out', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    sameSite: 'Lax',
  });
  res.status(200).json({ status: 'success' });
};

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(
        new AppError("You don't have permission to perform this action!", 403),
      );

    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1.Validate and check user based on email
  if (!validator.isEmail(req.body.email))
    return next(new AppError('Email invalid! Enter valid email address.'));
  const user = await Users.findOne({ email: req.body.email });
  if (!user) return next(new AppError('User not found with this email!'));

  //2.Generate reset token
  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3.Send token via email to user
  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    // await sendEmail({
    //   to: user.email,
    //   subject: 'Your password reset token (valid for 10 mins)',
    //   message,
    // });
    await new Email(user, resetURL).sendPasswordReset();
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passworResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the reset token! Please try again later.',
        500,
      ),
    );
  }
  res.status(200).json({
    status: 'success',
    message: 'Token sent to email',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1. Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await Users.findOne({
    passwordResetToken: hashedToken,
    passworResetExpires: { $gt: Date.now() },
  });
  //2. If token hasn't expired and there is a user, set the password
  if (!user) return next(new AppError('Token invalid or expired!', 400));
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.passworResetExpires = undefined;
  await user.save();
  //3. Modify the changedPasswordAt field
  //Done using middleware function

  //4.Log in the user
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  // console.log(req.body);
  //1. Get user from collection
  const currentUser = await Users.findById(req.user.id).select('+password');
  if (!currentUser)
    return next(new AppError('User of this token does not exist!', 401));

  //2. Check if POSTed current password is correct
  if (
    !(await currentUser.isCorrectPassword(
      currentPassword,
      currentUser.password,
    ))
  )
    return next(
      new AppError('Current password incorrect! You have 3 more tries.', 400),
    );
  //3.If so, update password
  currentUser.password = newPassword;
  currentUser.confirmPassword = confirmPassword;
  await currentUser.save();
  //4. Log user in, send JWT
  createSendToken(currentUser, 200, res);
});
