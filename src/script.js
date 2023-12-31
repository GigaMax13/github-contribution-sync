import axios from "axios";
import { parse } from "node-html-parser";
import shell from "shelljs";
import fs from "node:fs";

import { COMMIT_MESSAGE } from "./git.js";

const getCommitCount = (count, date, map, debug = false) => {
  const total = map?.has(date) ? count - map.get(date) : count;

  if (debug && count > 0) {
    console.log({
      date,
      count,
      map: map.get(date),
    });
  }

  return total;
};

export default async ({ execute, map, username, year }) => {
  const url = `https://github.com/users/${username}/contributions?tab=overview&from=${year}-01-01`;

  console.log(`\nFetching GitHub public data from:\n\n${url}`);

  // Returns contribution graph html for a full selected year.
  const { data } = await axios.get(url);

  // Retrieves needed data from the html, loops over green squares with 1+ contributions,
  // and produces a multi-line string that can be run as a bash command.
  const commits = parse(data)
    .querySelectorAll(".ContributionCalendar-day")
    .map((element) => {
      const { attributes, childNodes } = element;
      const date = attributes["data-date"];
      const level = parseInt(attributes["data-level"] ?? 0);
      const contributions = parseInt(
        childNodes?.[0]?.rawText?.replace(/(\d+)(.+)/g, "$1") ?? 0
      );
      const count = Math.max(level, contributions);

      return {
        date,
        count,
      };
    })
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

  const script = [
    ...commits,
    "git pull origin main\n",
    "git push -f origin main\n",
    "unset SYNC_REPO_TOKEN",
  ].join("");

  fs.writeFile("script.sh", script, () => {
    console.log("\nFile was created successfully.");

    if (execute) {
      console.log("This might take a moment!\n");
      shell.exec("sh ./script.sh");
    }
  });
};
