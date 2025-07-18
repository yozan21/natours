const mongoose = require('mongoose');
const { ref } = require('process');

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: [true, 'Booking must belong to a User!'],
    },
    tour: {
      type: mongoose.Types.ObjectId,
      ref: 'Tour',
      required: [true, 'Booking must belong to a Tour!'],
    },
    price: {
      type: Number,
      required: [true, 'Booking must have a price.'],
    },
    paid: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

bookingSchema.pre(/^find/, function (next) {
  this.populate('user').populate({
    path: 'tour',
    select: 'name',
  });
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
