import '../css/global.css';
import '../scss/global.scss';

import App from './app';

document.addEventListener('DOMContentLoaded', () => {});

window.addEventListener('load', () => {
  const canvas = document.querySelector('#canvas');

  if (canvas) {
    new App(document.querySelector('#canvas'));
  }
});
