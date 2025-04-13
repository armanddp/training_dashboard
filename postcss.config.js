import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import tailwindConfig from './tailwind.config.js'; // Import the Tailwind config

export default {
  plugins: [
    tailwindcss(tailwindConfig), // Pass the config object
    autoprefixer,
  ],
};