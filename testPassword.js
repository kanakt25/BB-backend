const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User'); 

mongoose.connect('mongodb://localhost:27017/jnu-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

(async () => {
  try {
    const user = await User.findOne({ email: 'ikl@jnu.ac.in' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    const isMatch = await bcrypt.compare('12345', user.password);
    if (isMatch) {
      console.log('✅ Password matches');
    } else {
      console.log('❌ Password does NOT match');
    }

    mongoose.disconnect();
  } catch (err) {
    console.error(err);
    mongoose.disconnect();
  }
})();
