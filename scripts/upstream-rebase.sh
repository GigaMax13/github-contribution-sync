#!/bin/bash

git remote add upstream https://github.com/GigaMax13/github-contribution-sync.git

git merge --allow-unrelated-histories upstream/main

git fetch upstream
git checkout main  # or your branch
git rebase upstream/main

