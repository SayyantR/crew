// Reference photos for the bundled Girlhood project.
export const PHOTOS = {
  1: require('./assets/photos/1.jpg'), 2: require('./assets/photos/2.jpg'), 3: require('./assets/photos/3.jpg'),
  4: require('./assets/photos/4.jpg'), 5: require('./assets/photos/5.jpg'), 6: require('./assets/photos/6.jpg'),
  7: require('./assets/photos/7.jpg'), 8: require('./assets/photos/8.jpg'), 9: require('./assets/photos/9.jpg'),
  10: require('./assets/photos/10.jpg'),
};
export const photo = n => PHOTOS[Math.min(10, Math.max(1, n || 1))];
