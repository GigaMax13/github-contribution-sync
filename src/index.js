import axios from "axios";
import inquirer from "inquirer";

import script from "./script.js";

// Define the questions for user input
const questions = [
  {
    type: "input",
    name: "username",
    message: "Enter the GitHub username to sync contributions:",
    validate: async (value) => {
      try {
        await axios.get(`https://api.github.com/users/${value}`);
        return true;
      } catch (error) {
        return "Please enter an existing GitHub username.";
      }
    },
  },
  {
    type: "input",
    name: "year",
    message: "Which year would you like to sync (default: current year):",
    default() {
      return new Date().getFullYear();
    },
  },
  {
    type: "list",
    message: "Select the synchronization mode:",
    name: "execute",
    choices: [
      {
        name: "Generate only, no execution.",
        value: false,
      },
      {
        name: `Generate a bash script & execute it immediately.\n  Note: It *will* push to origin main and is irreversible.`,
        value: true,
      },
    ],
    default: false,
  },
  {
    type: "confirm",
    name: "confirm",
    message: "Ready to proceed?",
  },
];

// Prompt the user with the questions and execute the script if confirmed
inquirer.prompt(questions).then((answers) => {
  if (answers.confirm) {
    script(answers);
  }
});
