import inquirer from "inquirer";
import fs from "node:fs";

import script from "./script.js";
import git from "./git.js";

import "dotenv/config";

const { SYNC_REPO_TOKEN } = process?.env || {};

const questions = [
  {
    type: "list",
    message: "Is your synchronization repo private?",
    name: "isPrivateRepo",
    choices: [
      {
        name: "No",
        value: false,
      },
      {
        name: "Yes",
        value: true,
      },
    ],
    default: false,
    when: () => !SYNC_REPO_TOKEN,
  },
  {
    type: "list",
    name: "shouldUpdateToken",
    message: "Would you like to update your GitHub token?",
    choices: [
      {
        name: "No",
        value: false,
      },
      {
        name: "Yes",
        value: true,
      },
    ],
    default: false,
    when: () => SYNC_REPO_TOKEN,
  },
  {
    type: "input",
    name: "token",
    message:
      "In order to fetch your repo commits history, please provide a GitHub token:",
    when: ({ isPrivateRepo, shouldUpdateToken }) =>
      isPrivateRepo || shouldUpdateToken,
  },
  {
    type: "list",
    message: "Would you like to save the token for future use?",
    name: "save",
    choices: [
      {
        name: "No",
        value: false,
      },
      {
        name: "Yes",
        value: true,
      },
    ],
    default: false,
    when: ({ isPrivateRepo, token }) => isPrivateRepo && token,
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

const update = async ({
  execute,
  save,
  shouldUpdateToken,
  token = SYNC_REPO_TOKEN,
}) => {
  const { map, username } = await git({ token });
  const year = new Date().getFullYear();

  if (save || shouldUpdateToken) {
    fs.writeFile(".env", `SYNC_REPO_TOKEN=${token}`, (err) => {
      if (!err) {
        console.log("\n Git token saved successfully.");
      }
    });
  }

  script({
    execute,
    map,
    username,
    year,
  });
};

inquirer.prompt(questions).then((answers) => {
  if (answers.confirm) {
    update(answers);
  }
});
