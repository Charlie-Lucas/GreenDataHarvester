# Use an official Node.js runtime as the base image
FROM node:16

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Install passport.js
RUN npm install passport

# Expose the application port
EXPOSE 3000

# Start the application
CMD [ "npm", "start" ]