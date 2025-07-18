/* eslint-disable*/
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import { showAlert } from './alert';

export const bookTour = async (tourId) => {
  try {
    const stripe = await loadStripe(
      'pk_test_51RlmjzFfBebOXgjepAwBJSQuxaIxa7qospEo57FVxiZsS1UTGB7LyHbm8x4YqcIAlv9vOyKWKm6wGIUJfXA26CKE00AkPmRpdu',
    );
    // 1. Get checkout session from api
    const res = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    // 2. Create checkout form + charge credit cards
    await stripe.redirectToCheckout({
      sessionId: res.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
