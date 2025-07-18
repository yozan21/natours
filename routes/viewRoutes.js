const express = require('express');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');
const { createBookingCheckout } = require('../controllers/bookingController');

const router = express.Router();

router.get(
  '/',
  createBookingCheckout,
  authController.isLoggedIn,
  viewController.getOverview,
);
router.get('/login', authController.isLoggedIn, viewController.getLoginForm);
router.get(
  '/tour/:slug',
  authController.isLoggedIn,
  viewController.getTourDetails,
);
router.get('/me', authController.protect, viewController.getAccount);
router.get('/bookings', authController.protect, viewController.getBookedTours);

module.exports = router;
