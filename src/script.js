import axios from "axios";
import { parse } from "node-html-parser";
import shell from "shelljs";
import fs from "node:fs";

import { COMMIT_MESSAGE } from "./git.js";

const getCommitCount = (count, date, map) =>
  map?.has(date) ? count - map.get(date) : count;

export default async ({ execute, map, username, year }) => {
  // Returns contribution graph html for a full selected year.
  const { data } = await axios.get(
    `https://github.com/users/${username}/contributions?tab=overview&from=${year}-01-01`
  );

  // Retrieves needed data from the html, loops over green squares with 1+ contributions,
  // and produces a multi-line string that can be run as a bash command.
  const commits = parse(data)
    .querySelectorAll(".ContributionCalendar-day")
    .map(({ attributes }) => ({
      date: attributes["data-date"],
      count: parseInt(attributes["data-level"]),
    }))
    .filter(({ count, date }) => date && getCommitCount(count, date, map) > 0)
    .flatMap(({ count, date }) =>
      Array(getCommitCount(count, date, map)).fill(
        `GIT_AUTHOR_DATE=${date}T12:00:00 GIT_COMMITTER_DATE=${date}T12:00:00 git commit --allow-empty -m "${username}${COMMIT_MESSAGE}" > /dev/null\n`
      )
    );

  if (!commits.length) {
    fs.unlink("script.sh", () => {
      console.log("No commits to be made.");
    });
    return;
  }

  console.log(`\n${commits.length} commits will be made.`);

  const script = commits
    .concat("git pull origin main\n", "git push -f origin main")
    .join("");

  fs.writeFile("script.sh", script, () => {
    console.log("\nFile was created successfully.");

    if (execute) {
      console.log("This might take a moment!\n");
      shell.exec("sh ./script.sh");
    }
  });
};
