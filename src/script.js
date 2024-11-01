import shell from "shelljs";
import fs from "node:fs";
import puppeteer from "puppeteer";

import { COMMIT_MESSAGE } from "./git.js";

const getCommitCount = (count, date, map, debug = false) => {
  const total = map?.has(date) ? count - map.get(date) : count;

  if (debug && map && count > 0) {
    console.log({
      date,
      count,
      map: map.get(date),
    });
  }

  return total;
};

export default async ({ execute, map, username, year }) => {
  const browser = await puppeteer.launch({ headless: true, timeout: 60000 });
  const pages = await browser.pages();
  const page = pages[0];
  await page.goto(
    `https://github.com/${username}?tab=overview&from=${year}-01-01`
  );

  await page.waitForSelector(".ContributionCalendar-day");

  const elements = await page.$$(".ContributionCalendar-day");

  // Extract the aria-labelledby attribute for each element
  const ariaLabels = [];
  for (const element of elements) {
    const id = await element.evaluate((node) =>
      node.getAttribute("aria-labelledby")
    );
    const date = await element.evaluate((node) =>
      node.getAttribute("data-date")
    );
    ariaLabels.push({
      date,
      id,
    });
  }

  const contributions = [];
  for (const { date, id } of ariaLabels) {
    const referencedElement = await page.$(`#${id}`);
    if (referencedElement) {
      const text = await referencedElement.evaluate((node) => node.innerText);

      // Attempt to extract the number of contributions using regex
      const match = text.match(/(\d+) contribution/);
      contributions.push({
        date,
        count: match ? parseInt(match[1], 10) : 0,
      });
    }
  }

  const commits = contributions
    .filter(({ count, date }) => getCommitCount(count, date, map) > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .flatMap(({ count, date }) =>
      Array(getCommitCount(count, date, map)).fill(
        `GIT_AUTHOR_DATE=${date}T11:00:00 GIT_COMMITTER_DATE=${date}T11:00:00 git commit --allow-empty -m "${username}${COMMIT_MESSAGE}" > /dev/null\n`
      )
    );

  if (!commits.length) {
    fs.unlink("script.sh", () => {
      console.log("No commits to be made.");
    });
    return await browser.close();
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

  await browser.close();
};
