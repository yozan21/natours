const Booking = require('../models/bookingsModel');
const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.alert = (req, res, next) => {
  const { alert } = req.query;
  if (alert === 'booking')
    res.locals.alert =
      'Your booking was successful! Please check your email for confirmation. If it is not shown here immediately then please try again later.';
  next();
};

exports.getOverview = catchAsync(async (req, res, next) => {
  const tours = await Tour.find();

  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});

exports.getTourDetails = catchAsync(async (req, res, next) => {
  const { slug } = req.params;
  // 1. Get the data for the requested tour including guides and reviews.
  const tour = await Tour.findOne({ slug }).populate({
    path: 'reviews',
    fields: 'review user rating',
  });

  if (!tour) return next(new AppError('There is no tour with that name.', 404));

  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log in to your account',
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your Account Settings',
  });
};

exports.getBookedTours = async (req, res) => {
  // Find the bookings of the logged in user
  const bookings = await Booking.find({ user: req.user.id });

  // Get all the tourIds from bookings and find those tours
  const tourIds = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIds } });

  //Render those tours
  res.status(200).render('overview', {
    title: 'My Bookings',
    tours,
  });
};
