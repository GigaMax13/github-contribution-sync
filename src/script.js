import axios from "axios";
import { parse } from "node-html-parser";
import shell from "shelljs";
import fs from "node:fs";

export default async ({ username, year, execute }) => {
  // Returns contribution graph html for a full selected year.
  const { data } = await axios.get(
    `https://github.com/users/${username}/contributions?tab=overview&from=${year}-01-01&to=${year}-12-31`
  );

  // Retrieves needed data from the html, loops over green squares with 1+ contributions,
  // and produces a multi-line string that can be run as a bash command.
  const commits = parse(data)
    .querySelectorAll(".ContributionCalendar-day")
    .map(({ attributes }) => ({
      date: attributes["data-date"],
      count: parseInt(attributes["data-level"]),
    }))
    .filter(({ date, count }) => date && count > 0)
    .flatMap(({ date, count }) =>
      Array(count).fill(
        `GIT_AUTHOR_DATE=${date}T12:00:00 GIT_COMMITTER_DATE=${date}T12:00:00 git commit --allow-empty -m "Rewriting History!" > /dev/null\n`
      )
    );

  if (!commits.length) {
    console.log("No commits to be made.");
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
