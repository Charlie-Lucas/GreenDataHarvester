const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cheerio = require('cheerio');
const bodyParser = require('body-parser');
const { ApolloServer } = require('apollo-server-express');

const app = express();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Passport middleware
app.use(passport.initialize());

// Passport config

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// GraphQL
const server = new ApolloServer({});
server.applyMiddleware({ app });

// Cheerio
app.use(cheerio());

// Use routes
app.use('/api/users', require('./routes/api/users'));
app.use('/api/profiles', require('./routes/api/profiles'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));