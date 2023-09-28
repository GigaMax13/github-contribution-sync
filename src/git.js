import { execSync } from "child_process";
import axios from "axios";

export const COMMIT_MESSAGE = "::user-synchronization";

const getGitConfig = (key) => {
  try {
    const value = execSync(`git config --local ${key}`, { encoding: "utf-8" });
    return value.trim();
  } catch (error) {
    return null;
  }
};

const listCommits = async (owner, repo, token) => {
  let allCommits = [];
  let page = 1;
  let username;

  while (true) {
    const { data: commits } = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits`,
      {
        params: { page, per_page: 100 },
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(!!token && {
            Authorization: `token ${token}`,
          }),
        },
      }
    );

    if (!commits?.length) {
      break;
    }

    allCommits = [...allCommits, ...commits];
    page++;
  }

  const totalCommits = allCommits.length;

  const syncCommitsMap = allCommits.reduce((acc, { commit }) => {
    if (commit.message?.includes(COMMIT_MESSAGE)) {
      if (!username) {
        username = commit.message.split(COMMIT_MESSAGE)[0];
      }

      const { author } = commit;
      // Extract only the date portion
      const date = author.date.split("T")[0];

      if (!acc.has(date)) {
        acc.set(date, 0);
      }

      const commitCount = acc.get(date) + 1;
      acc.set(date, commitCount);
    }

    return acc;
  }, new Map());

  console.log(`Sync commits found in ${owner}/${repo}: ${totalCommits}`);

  return { map: syncCommitsMap, username };
};

export default async ({ token }) => {
  const owner = getGitConfig("user.name");
  const repo = getGitConfig("remote.origin.url").match(/\/([^\/]+)\.git$/)[1];

  if (!(owner && repo)) return;

  return listCommits(owner, repo, token);
};
