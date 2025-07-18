/*eslint-disable */

import axios from 'axios';
import { showAlert } from './alert';

//type is either data || password
export const updateSettings = async (data, type) => {
  try {
    const url = `http://localhost:3000/api/v1/users/${type === 'password' ? 'updateMyPassword' : 'updateMe'}`;
    const res = await axios({
      method: 'PATCH',
      url,
      data,
      withCredentials: true,
    });
    if (res.data.status === 'success')
      showAlert('success', `${type.toUpperCase()} successfully updated`);
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
